import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LearningSessionDocument = HydratedDocument<LearningSession>;

export type SessionSource = 'reminder' | 'home' | 'deeplink' | 'unknown';

@Schema({ timestamps: true, collection: 'learning_sessions' })
export class LearningSession {
  @Prop({ required: true })
  userId!: number;

  @Prop()
  moduleRef?: string;

  @Prop()
  lessonRef?: string;

  @Prop({ required: true, enum: ['reminder', 'home', 'deeplink', 'unknown'], default: 'unknown' })
  source!: SessionSource;

  @Prop({ required: true, default: () => new Date() })
  startedAt!: Date;

  @Prop()
  endedAt?: Date;

  @Prop({ default: 0 })
  xpEarned?: number;
}

export const LearningSessionSchema = SchemaFactory.createForClass(LearningSession);
LearningSessionSchema.index({ userId: 1, startedAt: -1 });


