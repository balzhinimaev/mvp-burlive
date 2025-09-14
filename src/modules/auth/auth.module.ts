import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OnboardingGuard } from './onboarding.guard';
import { AdminGuard } from './admin.guard';
import { JwtStrategy } from './jwt.strategy';
import { PublicGuard } from '../common/guards/public.guard';
import { User, UserSchema } from '../common/schemas/user.schema';
import { AppEvent, EventSchema } from '../common/schemas/event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: AppEvent.name, schema: EventSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [AuthService, OnboardingGuard, AdminGuard, JwtStrategy, PublicGuard],
  controllers: [AuthController],
  exports: [AuthService, OnboardingGuard, AdminGuard, PublicGuard, JwtModule],
})
export class AuthModule {}


