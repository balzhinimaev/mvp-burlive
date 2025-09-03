import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { PromoRedemption, PromoRedemptionSchema } from '../common/schemas/promo-redemption.schema';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoRedemption.name, schema: PromoRedemptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [PromoController],
  providers: [PromoService],
})
export class PromoModule {}


