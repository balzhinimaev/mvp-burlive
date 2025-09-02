import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromoRedemptionDocument = HydratedDocument<PromoRedemption>;

@Schema({ timestamps: true, collection: 'promo_redemptions' })
export class PromoRedemption {
  @Prop({ required: true })
  promoId!: string; // e.g., BURI79

  @Prop({ required: true })
  userId!: number;

  @Prop({ required: true })
  discountPercent!: number;
}

export const PromoRedemptionSchema = SchemaFactory.createForClass(PromoRedemption);
PromoRedemptionSchema.index({ promoId: 1, userId: 1 }, { unique: true });


