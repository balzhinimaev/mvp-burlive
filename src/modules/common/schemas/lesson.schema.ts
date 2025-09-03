import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type LessonDocument = HydratedDocument<Lesson>;

@Schema({ timestamps: true, collection: 'lessons' })
export class Lesson {
  @Prop({ required: true })
  moduleRef!: string; // e.g., a0.travel

  @Prop({ required: true })
  lessonRef!: string; // e.g., a0.travel.001

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ default: 10 })
  estimatedMinutes?: number;

  @Prop({ type: [Object], default: [] })
  tasks?: Array<{ ref: string; type: string; data: Record<string, any> }>;

  @Prop({ default: true })
  published?: boolean;

  @Prop({ default: 0 })
  order?: number; // within module
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);
LessonSchema.index({ moduleRef: 1, order: 1 });
LessonSchema.index({ lessonRef: 1 }, { unique: true });


