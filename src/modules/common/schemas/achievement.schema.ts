import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AchievementDocument = HydratedDocument<Achievement>;

export type AchievementKey = 'first_lesson' | 'streak_3' | 'streak_7' | 'xp_500' | 'voice_10';

@Schema({ timestamps: true, collection: 'achievements' })
export class Achievement {
  @Prop({ required: true })
  userId!: number;

  @Prop({ required: true, enum: ['first_lesson', 'streak_3', 'streak_7', 'xp_500', 'voice_10'] })
  key!: AchievementKey;

  @Prop({ default: 0 })
  progress?: number;

  @Prop({ required: true })
  target!: number;

  @Prop({ default: false })
  unlocked?: boolean;

  @Prop()
  unlockedAt?: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
AchievementSchema.index({ userId: 1, key: 1 }, { unique: true });


