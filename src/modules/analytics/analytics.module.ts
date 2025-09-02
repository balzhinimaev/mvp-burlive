import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';
import { Payment, PaymentSchema } from '../common/schemas/payment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppEvent.name, schema: EventSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}


