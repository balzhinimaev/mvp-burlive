import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EntitlementDocument = HydratedDocument<Entitlement>;

@Schema({ timestamps: true, collection: 'entitlements' })
export class Entitlement {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ required: true })
  product!: 'monthly' | 'quarterly';

  @Prop({ required: true })
  startsAt!: Date;

  @Prop({ required: true })
  endsAt!: Date;
}

export const EntitlementSchema = SchemaFactory.createForClass(Entitlement);
EntitlementSchema.index({ userId: 1, product: 1 }, { unique: true });
EntitlementSchema.index({ endsAt: 1 });


