import { Controller, Get, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { Entitlement, EntitlementDocument } from '../common/schemas/entitlement.schema';

@Controller('paywall')
export class PaywallController {
  constructor(
    private readonly pricingService: PricingService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserLessonProgress.name) private readonly progressModel: Model<UserLessonProgressDocument>,
    @InjectModel(Entitlement.name) private readonly entitlementModel: Model<EntitlementDocument>,
  ) {}

  @Get()
  async getPaywall(@Query('userId') userId: string) {
    if (!userId) {
      return { error: 'userId is required' };
    }

    // Получаем данные пользователя
    const user = await this.userModel.findOne({ userId }).lean();
    if (!user) {
      return { error: 'User not found' };
    }

    // Считаем количество пройденных уроков
    const lessonCount = await this.progressModel.countDocuments({ 
      userId, 
      status: 'completed' 
    });

    // Проверяем активную подписку
    const activeEntitlement = await this.entitlementModel.findOne({
      userId,
      endsAt: { $gt: new Date() }
    }).lean();

    const hasSubscription = !!activeEntitlement;
    const subscriptionExpired = !hasSubscription && await this.entitlementModel.findOne({
      userId,
      endsAt: { $lt: new Date() }
    }).lean();

    // Определяем когорту
    const cohort = this.pricingService.determineCohort({
      isFirstOpen: !user.onboardingCompletedAt,
      lastActiveDate: user.updatedAt,
      lessonCount,
      hasSubscription,
      subscriptionExpired: !!subscriptionExpired
    });

    // Получаем ценообразование
    const pricing = this.pricingService.getPricing(cohort);
    const products = this.pricingService.getProducts(pricing);

    return {
      cohort,
      pricing,
      products,
      userStats: {
        lessonCount,
        hasActiveSubscription: hasSubscription,
        subscriptionExpired: !!subscriptionExpired
      }
    };
  }
}
