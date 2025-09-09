import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaywallController } from './paywall.controller';
import { PricingService } from './pricing.service';
import { User, UserSchema } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressSchema } from '../common/schemas/user-lesson-progress.schema';
import { Entitlement, EntitlementSchema } from '../common/schemas/entitlement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserLessonProgress.name, schema: UserLessonProgressSchema },
      { name: Entitlement.name, schema: EntitlementSchema },
    ]),
  ],
  controllers: [PaywallController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PaywallModule {}
