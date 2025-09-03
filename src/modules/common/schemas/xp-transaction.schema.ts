import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type XpTransactionDocument = HydratedDocument<XpTransaction>;

export type XpSource = 'task' | 'lesson_complete' | 'streak_bonus' | 'referral' | 'admin' | 'promo';

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'xp_transactions' })
export class XpTransaction {
  @Prop({ required: true })
  userId!: number;

  @Prop({ required: true, enum: ['task', 'lesson_complete', 'streak_bonus', 'referral', 'admin', 'promo'] })
  source!: XpSource;

  @Prop({ required: true })
  delta!: number; // positive or negative

  @Prop()
  ref?: string; // lessonRef/taskRef

  @Prop()
  sessionId?: string;

  @Prop({ type: Object })
  meta?: Record<string, any>;
}

export const XpTransactionSchema = SchemaFactory.createForClass(XpTransaction);
XpTransactionSchema.index({ userId: 1, createdAt: -1 });


