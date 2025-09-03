import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';
import { Payment, PaymentSchema } from '../common/schemas/payment.schema';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppEvent.name, schema: EventSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}


