import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OnboardingGuard } from './onboarding.guard';
import { User, UserSchema } from '../common/schemas/user.schema';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AppEvent.name, schema: EventSchema },
    ]),
  ],
  providers: [AuthService, OnboardingGuard],
  controllers: [AuthController],
  exports: [AuthService, OnboardingGuard],
})
export class AuthModule {}


