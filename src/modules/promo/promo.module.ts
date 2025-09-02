import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoService } from './promo.service';
import { PromoController } from './promo.controller';
import { PromoRedemption, PromoRedemptionSchema } from '../common/schemas/promo-redemption.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PromoRedemption.name, schema: PromoRedemptionSchema }]),
  ],
  controllers: [PromoController],
  providers: [PromoService],
})
export class PromoModule {}


