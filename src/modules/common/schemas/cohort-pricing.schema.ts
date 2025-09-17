import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CohortPricingDocument extends Document {
  @Prop({ required: true, unique: true })
  cohortName!: string;

  @Prop({ default: 0 })
  monthlyDiscount!: number;

  @Prop({ default: 0 })
  quarterlyDiscount!: number;

  @Prop({ default: 0 })
  yearlyDiscount!: number;

  @Prop()
  promoCode?: string;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  description?: string;

  @Prop({ default: 'system' })
  updatedBy!: string;
}

export const CohortPricingSchema = SchemaFactory.createForClass(CohortPricingDocument);
