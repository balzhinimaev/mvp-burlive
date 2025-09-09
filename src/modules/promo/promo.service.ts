import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoRedemption, PromoRedemptionDocument } from '../common/schemas/promo-redemption.schema';

@Injectable()
export class PromoService {
  constructor(
    @InjectModel(PromoRedemption.name)
    private readonly redemptionModel: Model<PromoRedemptionDocument>,
  ) {}

  async redeem(userId: string, promoId: string): Promise<{ ok: boolean; discountPercent: number }> {
    const discountPercent = promoId.toUpperCase() === 'BURI79' ? 50 : 0; // MVP rule
    if (discountPercent === 0) {
      throw new BadRequestException('Invalid promo');
    }
    await this.redemptionModel.create({ userId, promoId: promoId.toUpperCase(), discountPercent });
    return { ok: true, discountPercent };
  }
}


