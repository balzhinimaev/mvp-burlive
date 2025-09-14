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
    userId?: string; // Add userId for test detection
  }): UserCohort {
    // Check for specific test user ID
    if (user.userId === '1272270574') {
      return 'test_payment';
    }
    
    // Check for test payment users (userId starts with 'test_' or contains 'test')
    if (user.userId && (user.userId.startsWith('test_') || user.userId.includes('test'))) {
      return 'test_payment';
    }
    
    if (user.isFirstOpen) return 'new_user';
    if (user.subscriptionExpired) return 'premium_trial';
    if ((user.lessonCount || 0) > 20) return 'high_engagement';
    return 'default';
  }

  getPricing(cohort: UserCohort): CohortPricing {
    const base = { 
      monthlyOriginalPrice: 99000, // 990₽ в копейках
      monthlyPrice: 89000, // 890₽ в копейках
      quarterlyPrice: 119000, // 1190₽ в копейках
      yearlyPrice: 249000 // 2490₽ в копейках
    };
    
    // Подставь свои скидки:
    const map: Record<UserCohort, Partial<CohortPricing>> = {
      new_user: { discountPercentage: 25, monthlyPrice: 79000, promoCode: 'WELCOME25' }, // 790₽
      returning_user: { discountPercentage: 15, monthlyPrice: 84000, promoCode: 'COMEBACK15' }, // 840₽
      premium_trial: { discountPercentage: 50, monthlyPrice: 69000, promoCode: 'TRIAL50' }, // 690₽
      high_engagement: { discountPercentage: 20, monthlyPrice: 79000, promoCode: 'ACTIVE20' }, // 790₽
      low_engagement: { discountPercentage: 40, monthlyPrice: 59000, promoCode: 'BOOST40' }, // 590₽
      churned: { discountPercentage: 60, monthlyPrice: 49000, promoCode: 'WINBACK60' }, // 490₽
      test_payment: { 
        discountPercentage: 99, 
        monthlyPrice: 1000, 
        quarterlyPrice: 1000, 
        yearlyPrice: 1000, 
        promoCode: 'TEST10' 
      }, // 10₽ для всех типов подписки
      default: { discountPercentage: 10, monthlyPrice: 89000 }, // 890₽
    };
    
    return { cohort, ...base, ...(map[cohort] || {}) } as CohortPricing;
  }

  getProducts(pricing: CohortPricing): PaywallProduct[] {
    return [
      { 
        id: 'monthly', 
        name: 'Месяц', 
        description: 'Полный доступ ко всем урокам', 
        price: pricing.monthlyPrice, // в копейках
        currency: 'RUB', 
        duration: 'month', 
        discount: pricing.discountPercentage, 
        isPopular: true 
      },
      { 
        id: 'quarterly', 
        name: '3 месяца', 
        description: 'Экономия против помесячки', 
        price: pricing.quarterlyPrice, // в копейках
        currency: 'RUB', 
        duration: 'quarter' 
      },
      { 
        id: 'yearly', 
        name: 'Год', 
        description: 'Лучший выбор для прогресса', 
        price: pricing.yearlyPrice, // в копейках
        currency: 'RUB', 
        duration: 'year' 
      },
    ];
  }
}
