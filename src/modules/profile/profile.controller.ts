import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';

@Controller('profile')
export class ProfileController {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  @Get(':userId')
  async get(@Param('userId') userId: string) {
    const user = await this.userModel.findOne({ userId: Number(userId) }).lean();
    return { user };
  }

  @Patch()
  async update(
    @Body()
    body: {
      userId: number;
      firstName?: string;
      lastName?: string;
      username?: string;
      languageCode?: string;
      photoUrl?: string;
    },
  ) {
    const { userId, ...profile } = body;
    await this.userModel.updateOne({ userId }, { $set: profile }, { upsert: true });
    return { ok: true };
  }

  @Patch('onboarding/complete')
  async completeOnboarding(
    @Body()
    body: {
      userId: number;
      englishLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      learningGoals?: string[];
    },
  ) {
    const { userId, englishLevel, learningGoals } = body;
    await this.userModel.updateOne(
      { userId },
      { 
        $set: { 
          onboardingCompletedAt: new Date(), 
          englishLevel,
          ...(learningGoals && { learningGoals })
        } 
      },
      { upsert: true },
    );
    return { ok: true };
  }
}


