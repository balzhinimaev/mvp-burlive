import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EntitlementsModule } from './modules/entitlements/entitlements.module';
import { PromoModule } from './modules/promo/promo.module';
import { EventsModule } from './modules/events/events.module';
import { ContentModule } from './modules/content/content.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProfileModule } from './modules/profile/profile.module';
import { LeadsModule } from './modules/leads/leads.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || '', {
      dbName: process.env.MONGODB_DB_NAME || 'bulang-db',
    }),
    AuthModule,
    PaymentsModule,
    EntitlementsModule,
    PromoModule,
    EventsModule,
    ContentModule,
    AnalyticsModule,
    ProfileModule,
    LeadsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}


