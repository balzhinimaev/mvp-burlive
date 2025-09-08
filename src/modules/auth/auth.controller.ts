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
    userId: string;
    isFirstOpen: boolean;
    utm?: Record<string, string>;
    onboardingCompleted: boolean;
    englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    learningGoals?: string[];
  }> {
    const params = new URLSearchParams(query as any);
    return this.authService.verifyTelegramInitData(params);
  }

  @Get('onboarding/status/:userId')
  async getOnboardingStatus(@Param('userId') userId: string) {
    const user = await this.userModel.findOne({ userId: String(userId) }).lean();

    if (!user) {
      return {
        onboardingCompleted: false,
        englishLevel: null,
        learningGoals: [],
        onboardingRequired: true,
      };
    }

    return {
      onboardingCompleted: Boolean(user.onboardingCompletedAt),
      englishLevel: user.englishLevel || null,
      learningGoals: user.learningGoals || [],
      onboardingRequired: !Boolean(user.onboardingCompletedAt),
    };
  }
}


