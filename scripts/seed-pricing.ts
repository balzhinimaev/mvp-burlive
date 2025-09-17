import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CohortPricingDocument } from '../src/modules/common/schemas/cohort-pricing.schema';

async function seedPricing() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const cohortPricingModel = app.get<Model<CohortPricingDocument>>(
    getModelToken(CohortPricingDocument.name)
  );

  console.log('🧹 Очищаем существующие данные...');
  await cohortPricingModel.deleteMany({});

  // Создаем настройки для всех когорт с улучшенными скидками
  const pricingConfigs = [
    {
      cohortName: 'default',
      monthlyDiscount: 10,
      quarterlyDiscount: 20,
      yearlyDiscount: 17,
      promoCode: 'DEFAULT10',
      isActive: true,
      description: 'Базовые скидки для обычных пользователей',
      updatedBy: 'system'
    },
    {
      cohortName: 'new_user',
      monthlyDiscount: 15,
      quarterlyDiscount: 20,
      yearlyDiscount: 25,
      promoCode: 'WELCOME15',
      isActive: true,
      description: 'Умеренные скидки для новых пользователей',
      updatedBy: 'system'
    },
    {
      cohortName: 'returning_user',
      monthlyDiscount: 15,
      quarterlyDiscount: 20,
      yearlyDiscount: 25,
      promoCode: 'COMEBACK15',
      isActive: true,
      description: 'Скидки для возвращающихся пользователей',
      updatedBy: 'system'
    },
    {
      cohortName: 'premium_trial',
      monthlyDiscount: 50,
      quarterlyDiscount: 55,
      yearlyDiscount: 60,
      promoCode: 'TRIAL50',
      isActive: true,
      description: 'Скидки для пользователей с истекшей премиум подпиской',
      updatedBy: 'system'
    },
    {
      cohortName: 'high_engagement',
      monthlyDiscount: 20,
      quarterlyDiscount: 25,
      yearlyDiscount: 30,
      promoCode: 'ACTIVE20',
      isActive: true,
      description: 'Скидки для активных пользователей',
      updatedBy: 'system'
    },
    {
      cohortName: 'low_engagement',
      monthlyDiscount: 40,
      quarterlyDiscount: 45,
      yearlyDiscount: 50,
      promoCode: 'BOOST40',
      isActive: true,
      description: 'Скидки для пользователей с низкой активностью',
      updatedBy: 'system'
    },
    {
      cohortName: 'churned',
      monthlyDiscount: 60,
      quarterlyDiscount: 65,
      yearlyDiscount: 70,
      promoCode: 'WINBACK60',
      isActive: true,
      description: 'Скидки для возврата ушедших пользователей',
      updatedBy: 'system'
    },
    {
      cohortName: 'test_payment',
      monthlyDiscount: 99,
      quarterlyDiscount: 99,
      yearlyDiscount: 99,
      promoCode: 'TEST10',
      isActive: true,
      description: 'Тестовые платежи - символическая цена',
      updatedBy: 'system'
    }
  ];

  console.log('📊 Добавляем настройки ценообразования...');
  const result = await cohortPricingModel.insertMany(pricingConfigs);

  console.log('✅ Данные для ценообразования успешно добавлены!');
  console.log(`📊 Добавлено ${result.length} записей`);

  // Показываем добавленные данные
  console.log('\n📋 Добавленные когорты:');
  const insertedData = await cohortPricingModel.find({}, { 
    cohortName: 1, 
    monthlyDiscount: 1, 
    quarterlyDiscount: 1, 
    yearlyDiscount: 1, 
    promoCode: 1 
  });
  
  insertedData.forEach(item => {
    console.log(`- ${item.cohortName}: ${item.monthlyDiscount}%/${item.quarterlyDiscount}%/${item.yearlyDiscount}% (${item.promoCode})`);
  });

  await app.close();
}

seedPricing().catch(console.error);
