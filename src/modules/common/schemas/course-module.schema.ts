import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourseModuleDocument = HydratedDocument<CourseModule>;

@Schema({ timestamps: true, collection: 'course_modules' })
export class CourseModule {
  @Prop({ required: true, unique: true })
  moduleRef!: string; // e.g., a0.travel

  @Prop({ required: true })
  level!: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[]; // e.g., travel, speaking

  @Prop({ default: true })
  published?: boolean;

  @Prop({ default: 0 })
  order?: number;
}

export const CourseModuleSchema = SchemaFactory.createForClass(CourseModule);
CourseModuleSchema.index({ level: 1, order: 1 });


