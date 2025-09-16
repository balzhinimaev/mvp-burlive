import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VocabularyDocument = HydratedDocument<VocabularyItem>;

@Schema({ timestamps: true, collection: 'vocabulary_items' })
export class VocabularyItem {
  @Prop({ required: true, unique: true })
  id!: string; // 'hello'

  @Prop({ required: true }) word!: string;
  @Prop({ default: '' }) translation?: string;

  @Prop() transcription?: string;
  @Prop() pronunciation?: string;
  @Prop() partOfSpeech?: string;
  
  @Prop({ enum: ['easy', 'medium', 'hard'], default: 'easy' })
  difficulty?: 'easy' | 'medium' | 'hard';

  @Prop({ type: [{ original: String, translation: String }], default: [] })
  examples?: Array<{ original: string; translation: string }>;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ type: [String], default: [] })
  lessonRefs?: string[];

  @Prop({ type: [String], default: [] })
  moduleRefs?: string[]; // Modules where this word appears

  @Prop() audioKey?: string; // TTS audio key for pronunciation

  @Prop({ default: 0 })
  occurrenceCount?: number; // How many times word appears in lessons

}
export const VocabularySchema = SchemaFactory.createForClass(VocabularyItem);
