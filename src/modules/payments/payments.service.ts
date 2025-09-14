import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Payment, PaymentDocument } from '../common/schemas/payment.schema';
import { Entitlement, EntitlementDocument } from '../common/schemas/entitlement.schema';
import { AppEvent, EventDocument } from '../common/schemas/event.schema';
import { User, UserDocument } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { PricingService } from '../paywall/pricing.service';

interface WebhookPayload {
  provider: string;
  providerId: string;
  idempotencyKey: string;
  userId: string;
  product: 'monthly' | 'quarterly' | 'yearly';
  amount: number; // RUB cents
  currency: string; // RUB
  status: 'succeeded' | 'pending' | 'failed';
}

interface CreatePaymentRequest {
  userId: string;
  product: 'monthly' | 'quarterly' | 'yearly';
  returnUrl: string;
  description?: string;
}

interface YooKassaPaymentResponse {
  id: string;
  status: string;
  paid: boolean;
  amount: {
    value: string;
    currency: string;
  };
  confirmation: {
    type: string;
    confirmation_url: string;
  };
  created_at: string;
  description: string;
  metadata: Record<string, any>;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Entitlement.name) private readonly entitlementModel: Model<EntitlementDocument>,
    @InjectModel(AppEvent.name) private readonly eventModel: Model<EventDocument>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserLessonProgress.name) private readonly progressModel: Model<UserLessonProgressDocument>,
    private readonly pricingService: PricingService,
  ) {}

  // YooKassa API configuration
  private readonly yookassaApiUrl = process.env.YOOKASSA_API_URL || 'https://api.yookassa.ru/v3';
  private readonly shopId = process.env.YOOKASSA_SHOP_ID;
  private readonly secretKey = process.env.YOOKASSA_SECRET_KEY;

  /**
   * Generate informative payment description with subscription details
   */
  private generatePaymentDescription(product: 'monthly' | 'quarterly' | 'yearly', amount: number, cohort: string): string {
    const productNames = {
      monthly: 'месячная',
      quarterly: 'квартальная', 
      yearly: 'годовая'
    };

    const durations = {
      monthly: '30 дней',
      quarterly: '90 дней',
      yearly: '365 дней'
    };

    const price = (amount / 100).toFixed(0);
    const productName = productNames[product];
    const duration = durations[product];
    
    return `Инглиш в ТГ - ${productName} подписка (${duration}) • ${price} ₽`;
  }

  async processWebhook(payload: WebhookPayload): Promise<{ ok: boolean }> {
    // Idempotency check based on unique index will protect us; try to insert in tx
    const session = await this.connection.startSession();
    try {
      await session.withTransaction(async () => {
        const payment = await this.paymentModel.create([
          {
            userId: payload.userId,
            provider: payload.provider,
            providerId: payload.providerId,
            idempotencyKey: payload.idempotencyKey,
            product: payload.product,
            amount: payload.amount,
            currency: payload.currency,
            status: payload.status,
          },
        ], { session });

        if (payload.status === 'succeeded') {
          const durationDays = payload.product === 'yearly' ? 365 : payload.product === 'monthly' ? 30 : 90;
          const now = new Date();

          // Fetch existing entitlement to extend from current endsAt if in the future
          const existing = await this.entitlementModel.findOne({ userId: payload.userId, product: payload.product }).session(session);
          const base = existing?.endsAt && existing.endsAt > now ? existing.endsAt : now;
          const newEndsAt = new Date(base.getTime() + durationDays * 24 * 60 * 60 * 1000);

          await this.entitlementModel.updateOne(
            { userId: payload.userId, product: payload.product },
            {
              $setOnInsert: { startsAt: existing?.startsAt || now },
              $set: { endsAt: newEndsAt },
            },
            { upsert: true, session },
          );

          const user = await this.userModel.findOne({ userId: payload.userId }).lean();
          await this.eventModel.create([
            {
              userId: payload.userId,
              name: 'purchase_success',
              ts: new Date(),
              properties: {
                provider: payload.provider,
                providerId: payload.providerId,
                product: payload.product,
                amount: payload.amount,
                currency: payload.currency,
                ...(user?.firstUtm ? { utm: user.firstUtm } : {}),
              },
            },
          ], { session });
        }
      });

      return { ok: true };
    } catch (err: any) {
      // Duplicate key => idempotent success
      if (err && (err.code === 11000 || err.codeName === 'DuplicateKey')) {
        this.logger.warn(`Idempotent duplicate for providerId=${payload.providerId} key=${payload.idempotencyKey}`);
        return { ok: true };
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Process YooKassa webhook payload (payment.* events)
   * See: https://yookassa.ru/developers/payment-acceptance/getting-started/quick-start
   */
  async processYooKassaWebhook(
    payload: { event: string; object: any },
    idempotenceKeyHeader?: string,
  ): Promise<{ ok: boolean }> {
    const eventType = payload?.event;
    const paymentObj = payload?.object || {};

    const provider = 'yookassa';
    const providerId: string = paymentObj?.id || 'unknown';
    const amountValue: number = Math.round(parseFloat(paymentObj?.amount?.value || '0') * 100);
    const currency: string = paymentObj?.amount?.currency || 'RUB';
    const metadata: any = paymentObj?.metadata || {};

    // Expect client to send userId & product in metadata
    const userIdRaw = metadata.userId;
    const productRaw = metadata.product as 'monthly' | 'quarterly' | 'yearly' | undefined;
    const userId = typeof userIdRaw === 'string' ? userIdRaw : String(userIdRaw || '');

    const statusMap: Record<string, 'succeeded' | 'pending' | 'failed'> = {
      'payment.succeeded': 'succeeded',
      'payment.waiting_for_capture': 'pending',
      'payment.canceled': 'failed',
      'refund.succeeded': 'succeeded',
    } as const;
    const mappedStatus = statusMap[eventType] || 'pending';

    // Determine product and entitlement duration
    const product: 'monthly' | 'quarterly' | 'yearly' = (productRaw as any) || 'monthly';

    // Reuse existing logic with normalized payload
    return this.processWebhook({
      provider,
      providerId,
      idempotencyKey: idempotenceKeyHeader || providerId,
      userId,
      product: product === 'yearly' ? 'yearly' : product,
      amount: amountValue,
      currency,
      status: mappedStatus,
    });
  }

  /**
   * Create payment via YooKassa API
   * Based on: https://yookassa.ru/developers/payment-acceptance/getting-started/quick-start
   */
  async createPayment(request: CreatePaymentRequest): Promise<{ paymentUrl: string; paymentId: string }> {
    if (!this.shopId || !this.secretKey) {
      throw new BadRequestException('YooKassa credentials not configured');
    }

    // Get user data for pricing calculation
    const user = await this.userModel.findOne({ userId: request.userId }).lean();
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Calculate pricing based on user cohort
    const lessonCount = await this.progressModel.countDocuments({ 
      userId: request.userId, 
      status: 'completed' 
    });

    const activeEntitlement = await this.entitlementModel.findOne({
      userId: request.userId,
      endsAt: { $gt: new Date() }
    }).lean();

    const hasSubscription = !!activeEntitlement;
    const subscriptionExpired = !hasSubscription && await this.entitlementModel.findOne({
      userId: request.userId,
      endsAt: { $lt: new Date() }
    }).lean();

    const cohort = this.pricingService.determineCohort({
      isFirstOpen: !user.onboardingCompletedAt,
      lastActiveDate: user.updatedAt,
      lessonCount,
      hasSubscription,
      subscriptionExpired: !!subscriptionExpired
    });

    const pricing = this.pricingService.getPricing(cohort);
    
    // Get price for selected product
    let amount: number;
    switch (request.product) {
      case 'monthly':
        amount = pricing.monthlyPrice;
        break;
      case 'quarterly':
        amount = pricing.quarterlyPrice;
        break;
      case 'yearly':
        amount = pricing.yearlyPrice;
        break;
      default:
        throw new BadRequestException('Invalid product type');
    }

    // Generate idempotency key
    const idempotencyKey = `payment_${request.userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare payment data for YooKassa
    const paymentData = {
      amount: {
        value: (amount / 100).toFixed(2), // Convert from cents to rubles
        currency: 'RUB'
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: request.returnUrl
      },
      description: request.description || this.generatePaymentDescription(request.product, amount, cohort),
      receipt: {
        customer: {
          email: user.email || `user_${request.userId}@burlive.ru` // Use email or fallback to userId-based email
        },
        items: [
          {
            description: this.generatePaymentDescription(request.product, amount, cohort),
            quantity: '1.00',
            amount: {
              value: (amount / 100).toFixed(2),
              currency: 'RUB'
            },
            vat_code: 1 // НДС 20%
          }
        ]
      },
      metadata: {
        userId: request.userId,
        product: request.product,
        cohort: cohort
      },
      // Explicitly set test: false to ensure production mode
      test: false
    };

    try {
      // Log payment details for debugging
      this.logger.log(`Creating payment with YooKassa API: ${this.yookassaApiUrl}`);
      this.logger.log(`Payment description: ${paymentData.description}`);
      this.logger.log(`Shop ID: ${this.shopId?.substring(0, 8)}...`);
      this.logger.log(`Payment data: ${JSON.stringify(paymentData, null, 2)}`);

      // Make request to YooKassa API
      const response = await fetch(`${this.yookassaApiUrl}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotence-Key': idempotencyKey,
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`YooKassa API error: ${response.status} - ${errorText}`);
        throw new BadRequestException(`Payment creation failed: ${response.status}`);
      }

      const paymentResponse = await response.json() as YooKassaPaymentResponse;
      
      // Log payment response for debugging
      this.logger.log(`YooKassa payment created: ${paymentResponse.id}`);
      this.logger.log(`Payment status: ${paymentResponse.status}`);
      this.logger.log(`Payment description in response: ${paymentResponse.description}`);

      // Save payment to database immediately
      await this.paymentModel.create([{
        userId: request.userId,
        provider: 'yookassa',
        providerId: paymentResponse.id,
        idempotencyKey: idempotencyKey,
        product: request.product,
        amount: amount,
        currency: 'RUB',
        status: 'pending'
      }]);

      // Log payment creation event
      await this.eventModel.create([{
        userId: request.userId,
        name: 'payment_created',
        ts: new Date(),
        properties: {
          paymentId: paymentResponse.id,
          product: request.product,
          amount: amount,
          currency: 'RUB',
          cohort: cohort,
          pricing: pricing
        }
      }]);

      return {
        paymentUrl: paymentResponse.confirmation.confirmation_url,
        paymentId: paymentResponse.id
      };

    } catch (error: any) {
      this.logger.error(`Failed to create payment: ${error.message}`);
      throw new BadRequestException('Failed to create payment');
    }
  }

  /**
   * Get payment status from YooKassa
   */
  async getPaymentStatus(paymentId: string): Promise<{ status: string; paid: boolean }> {
    if (!this.shopId || !this.secretKey) {
      throw new BadRequestException('YooKassa credentials not configured');
    }

    try {
      const response = await fetch(`${this.yookassaApiUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.shopId}:${this.secretKey}`).toString('base64')}`
        }
      });

      if (!response.ok) {
        throw new BadRequestException(`Failed to get payment status: ${response.status}`);
      }

      const payment = await response.json() as YooKassaPaymentResponse;
      
      return {
        status: payment.status,
        paid: payment.paid
      };

    } catch (error: any) {
      this.logger.error(`Failed to get payment status: ${error.message}`);
      throw new BadRequestException('Failed to get payment status');
    }
  }
}


