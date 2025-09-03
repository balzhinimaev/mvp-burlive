import { Controller, Get, Query, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  @Get('verify')
  async verify(
    @Query() query: Record<string, string>,
  ): Promise<{
    userId: number;
    isFirstOpen: boolean;
    utm?: Record<string, string>;
    onboardingCompleted: boolean;
    proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
  }> {
    const params = new URLSearchParams(query as any);
    return this.authService.verifyTelegramInitData(params);
  }

  @Get('onboarding/status/:userId')
  async getOnboardingStatus(@Param('userId') userId: string) {
    const user = await this.userModel.findOne({ userId: Number(userId) }).lean();

    if (!user) {
      return {
        onboardingCompleted: false,
        proficiencyLevel: null,
        onboardingRequired: true,
      };
    }

    return {
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      proficiencyLevel: user.proficiencyLevel || null,
      onboardingRequired: !Boolean(user.onboardingCompletedAt),
    };
  }
}


