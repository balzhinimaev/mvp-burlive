import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ required: true })
  provider!: string; // e.g., tinkoff/yookassa/mock

  @Prop({ required: true })
  providerId!: string; // provider payment id

  @Prop({ required: true })
  idempotencyKey!: string; // from provider webhook or generated

  @Prop({ required: true })
  product!: string; // monthly/quarterly

  @Prop({ required: true })
  amount!: number; // in RUB cents

  @Prop({ required: true })
  currency!: string; // RUB

  @Prop({ required: true })
  status!: 'succeeded' | 'pending' | 'failed';
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ providerId: 1, idempotencyKey: 1 }, { unique: true });


