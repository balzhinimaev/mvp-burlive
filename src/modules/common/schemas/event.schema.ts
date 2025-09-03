import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EventDocument = HydratedDocument<AppEvent>;

@Schema({
  timestamps: true,
  collection: 'events',
})
export class AppEvent {
  @Prop({ required: true })
  userId!: number;

  @Prop({ required: true })
  name!: 'open_app' | 'start_lesson' | 'complete_lesson' | 'vocabulary_learned' | 'grammar_practiced' | 'speaking_completed' | 'listening_completed' | 'paywall_view' | 'purchase_success';

  @Prop({ type: Object })
  properties?: Record<string, any>;

  @Prop({ required: true })
  ts!: Date;
}

export const EventSchema = SchemaFactory.createForClass(AppEvent);
EventSchema.index({ ts: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 60 });


