import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true })
  userId!: number;

  @Prop({ type: Object })
  firstUtm?: Record<string, string>;

  @Prop({ type: Object })
  lastUtm?: Record<string, string>;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  username?: string;

  @Prop()
  languageCode?: string;

  @Prop()
  photoUrl?: string;

  @Prop()
  onboardingCompletedAt?: Date;

  @Prop()
  englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  @Prop()
  learningGoals?: string[];

  @Prop({ default: 'UTC' })
  tz?: string;

  @Prop()
  locale?: string;

  @Prop({ type: Object })
  hints?: { script?: 'cyr' | 'translit' | 'both' };

  @Prop({ default: 0 })
  xpTotal?: number;

  @Prop({ type: Object })
  streak?: { current: number; longest: number; lastActiveDayKey?: string };

  @Prop()
  lastLessonRef?: string;

  @Prop({ type: Object })
  pro?: { active: boolean; since?: Date; plan?: string };
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ userId: 1 }, { unique: true });


