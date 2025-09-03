import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Lead, LeadSchema } from '../common/schemas/lead.schema';
import { LeadsController } from './leads.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Lead.name, schema: LeadSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
  ],
  controllers: [LeadsController],
})
export class LeadsModule {}


