import { Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Payment, PaymentDocument } from '../common/schemas/payment.schema';
import { Entitlement, EntitlementDocument } from '../common/schemas/entitlement.schema';
import { AppEvent, EventDocument } from '../common/schemas/event.schema';
import { User, UserDocument } from '../common/schemas/user.schema';

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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Entitlement.name) private readonly entitlementModel: Model<EntitlementDocument>,
    @InjectModel(AppEvent.name) private readonly eventModel: Model<EventDocument>,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

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
}


