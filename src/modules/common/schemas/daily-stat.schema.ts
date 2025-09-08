import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DailyStatDocument = HydratedDocument<DailyStat>;

@Schema({ timestamps: true, collection: 'daily_stats' })
export class DailyStat {
  @Prop({ type: String, required: true })
  userId!: string;

  @Prop({ required: true })
  dayKey!: string; // YYYY-MM-DD in user's tz

  @Prop({ required: true })
  tz!: string;

  @Prop({ default: 0 })
  xpEarned?: number;

  @Prop({ default: 0 })
  lessonsCompleted?: number;

  @Prop({ default: 0 })
  tasksCompleted?: number;
}

export const DailyStatSchema = SchemaFactory.createForClass(DailyStat);
DailyStatSchema.index({ userId: 1, dayKey: 1 }, { unique: true });


