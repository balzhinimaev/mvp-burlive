import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { PromoRedemption, PromoRedemptionSchema } from '../common/schemas/promo-redemption.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PromoRedemption.name, schema: PromoRedemptionSchema }]),
    AuthModule,
  ],
  controllers: [PromoController],
  providers: [PromoService],
})
export class PromoModule {}


