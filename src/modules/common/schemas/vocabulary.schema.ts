import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VocabularyDocument = HydratedDocument<VocabularyItem>;

@Schema({ timestamps: true, collection: 'vocabulary_items' })
export class VocabularyItem {
  @Prop({ required: true, unique: true })
  id!: string; // 'hello'

  @Prop({ required: true }) word!: string;
  @Prop({ required: true }) translation!: string;

  @Prop() transcription?: string;
  @Prop() pronunciation?: string;
  @Prop() partOfSpeech?: string;
  @Prop() difficulty?: string;

  @Prop({ type: [{ original: String, translation: String }], default: [] })
  examples?: Array<{ original: string; translation: string }>;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  lessonRefs?: string[];

  @Prop({ default: false })
  isLearned?: boolean;
}
export const VocabularySchema = SchemaFactory.createForClass(VocabularyItem);
