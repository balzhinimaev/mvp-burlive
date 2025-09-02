import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, PaymentSchema } from '../common/schemas/payment.schema';
import { Entitlement, EntitlementSchema } from '../common/schemas/entitlement.schema';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';
import { User, UserSchema } from '../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Entitlement.name, schema: EntitlementSchema },
      { name: AppEvent.name, schema: EventSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [PaymentsService],
  controllers: [PaymentsController],
})
export class PaymentsModule {}


