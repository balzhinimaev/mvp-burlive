import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { ProgressModule } from './modules/progress/progress.module';
import { PaywallModule } from './modules/paywall/paywall.module';
import { validationSchema } from './config/validation.schema';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('app.database.uri'),
        dbName: configService.get<string>('app.database.dbName'),
      }),
      inject: [ConfigService],
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
    ProgressModule,
    PaywallModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}


