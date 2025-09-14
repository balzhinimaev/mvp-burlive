import { Controller, Get, Query, Param, Post, Body, BadRequestException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { PublicGuard } from '../common/guards/public.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  @Get('verify')
  @UseGuards(PublicGuard)
  async verify(
    @Query() query: Record<string, string>,
  ): Promise<{
    userId: string;
    isFirstOpen: boolean;
    utm?: Record<string, string>;
    onboardingCompleted: boolean;
    englishLevel?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
    learningGoals?: string[];
    accessToken: string;
  }> {
    const params = new URLSearchParams(query as any);
    return this.authService.verifyTelegramInitData(params);
  }

  @Get('onboarding/status/:userId')
  @UseGuards(PublicGuard)
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

  @Post('test-user')
  async createTestUser(@Body() body: { userId: string; firstName?: string; email?: string }) {
    // 🔒 Basic security: only allow test users in development or with specific pattern
    if (process.env.NODE_ENV === 'production' && !body.userId.includes('test')) {
      throw new BadRequestException('Test user creation not allowed in production');
    }
    const { userId, firstName = 'Test User', email } = body;
    
    // Check if user already exists
    const existingUser = await this.userModel.findOne({ userId }).lean();
    if (existingUser) {
      return {
        success: true,
        message: 'User already exists',
        userId,
        user: existingUser
      };
    }

    // Create test user
    const testUser = await this.userModel.create({
      userId,
      firstName,
      email,
      onboardingCompletedAt: new Date(), // Mark as completed for testing
      englishLevel: 'A1',
      learningGoals: ['test'],
      firstUtm: { source: 'test' },
      lastUtm: { source: 'test' }
    });

    return {
      success: true,
      message: 'Test user created successfully',
      userId,
      user: testUser
    };
  }
}


