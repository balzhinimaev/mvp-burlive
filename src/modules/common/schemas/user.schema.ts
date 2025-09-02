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
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ userId: 1 }, { unique: true });


