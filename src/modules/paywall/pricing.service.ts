// src/paywall/pricing.service.ts
import { Injectable } from '@nestjs/common';
import { UserCohort, CohortPricing, PaywallProduct } from '../common/types/content';

@Injectable()
export class PricingService {
  determineCohort(user: { 
    isFirstOpen?: boolean; 
    lastActiveDate?: Date; 
    lessonCount?: number; 
    hasSubscription?: boolean; 
    subscriptionExpired?: boolean; 
  }): UserCohort {
    if (user.isFirstOpen) return 'new_user';
    if (user.subscriptionExpired) return 'premium_trial';
    if ((user.lessonCount || 0) > 20) return 'high_engagement';
    return 'default';
  }

  getPricing(cohort: UserCohort): CohortPricing {
    const base = { 
      monthlyOriginalPrice: 990, 
      monthlyPrice: 890, 
      quarterlyPrice: 1190, 
      yearlyPrice: 2490 
    };
    
    // Подставь свои скидки:
    const map: Record<UserCohort, Partial<CohortPricing>> = {
      new_user: { discountPercentage: 25, monthlyPrice: 790, promoCode: 'WELCOME25' },
      returning_user: { discountPercentage: 15, monthlyPrice: 840, promoCode: 'COMEBACK15' },
      premium_trial: { discountPercentage: 50, monthlyPrice: 690, promoCode: 'TRIAL50' },
      high_engagement: { discountPercentage: 20, monthlyPrice: 790, promoCode: 'ACTIVE20' },
      low_engagement: { discountPercentage: 40, monthlyPrice: 590, promoCode: 'BOOST40' },
      churned: { discountPercentage: 60, monthlyPrice: 490, promoCode: 'WINBACK60' },
      default: { discountPercentage: 10, monthlyPrice: 890 },
    };
    
    return { cohort, ...base, ...(map[cohort] || {}) } as CohortPricing;
  }

  getProducts(pricing: CohortPricing): PaywallProduct[] {
    return [
      { 
        id: 'monthly', 
        name: 'Месяц', 
        description: 'Полный доступ ко всем урокам', 
        price: pricing.monthlyPrice, 
        currency: 'RUB', 
        duration: 'month', 
        discount: pricing.discountPercentage, 
        isPopular: true 
      },
      { 
        id: 'quarterly', 
        name: '3 месяца', 
        description: 'Экономия против помесячки', 
        price: pricing.quarterlyPrice, 
        currency: 'RUB', 
        duration: 'quarter' 
      },
      { 
        id: 'yearly', 
        name: 'Год', 
        description: 'Лучший выбор для прогресса', 
        price: pricing.yearlyPrice, 
        currency: 'RUB', 
        duration: 'year' 
      },
    ];
  }
}
