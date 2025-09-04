import { Body, Controller, Get, Param, Patch, Post, BadRequestException } from '@nestjs/common';
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
      // Backward compatibility: keep englishLevel, but also accept new proficiencyLevel
      englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
      learningGoals?: string[];
    },
  ) {
    const { userId, englishLevel, proficiencyLevel, learningGoals } = body;
    if (!userId) {
      // For protected endpoints userId must be provided in the top-level request body
      throw new BadRequestException('userId is required');
    }

    // Prepare $set object idempotently
    const set: Record<string, any> = {
      onboardingCompletedAt: new Date(),
    };
    if (englishLevel) set.englishLevel = englishLevel;
    if (proficiencyLevel) set.proficiencyLevel = proficiencyLevel;
    if (learningGoals) set.learningGoals = learningGoals;
    await this.userModel.updateOne(
      { userId },
      { $set: set },
      { upsert: true },
    );
    return { ok: true };
  }

  // Allowed values for onboarding settings. Keep here to avoid scattering magic strings.
  // These should mirror the frontend contract and can be centralized later.
  private readonly allowedGoals = [
    'work_career',
    'study_exams',
    'travel',
    'communication',
    'entertainment',
    'relocation',
    'curiosity',
  ] as const;

  private readonly allowedReminderTimes = ['morning', 'afternoon', 'evening'] as const;

  private isValidDailyGoal(value: number): value is 5 | 10 | 15 | 20 {
    return [5, 10, 15, 20].includes(value);
  }

  @Post('learning-goals')
  async saveLearningGoals(
    @Body()
    body: {
      userId: number;
      goals: typeof this.allowedGoals[number][];
    },
  ) {
    const { userId, goals } = body;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (!Array.isArray(goals) || goals.length === 0) {
      throw new BadRequestException('goals must be a non-empty array');
    }
    const invalid = goals.filter((g) => !this.allowedGoals.includes(g as any));
    if (invalid.length) {
      throw new BadRequestException(`Invalid goals: ${invalid.join(', ')}`);
    }
    await this.userModel.updateOne(
      { userId },
      { $set: { learningGoals: goals } },
      { upsert: true },
    );
    return { ok: true };
  }

  @Post('daily-goal')
  async saveDailyGoal(
    @Body()
    body: {
      userId: number;
      dailyGoalMinutes: 5 | 10 | 15 | 20;
      allowsNotifications?: boolean;
    },
  ) {
    const { userId, dailyGoalMinutes, allowsNotifications } = body;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (!this.isValidDailyGoal(dailyGoalMinutes)) {
      throw new BadRequestException('dailyGoalMinutes must be one of 5, 10, 15, 20');
    }
    const set: Record<string, any> = { dailyGoalMinutes };
    if (typeof allowsNotifications === 'boolean') {
      set.notificationsAllowed = allowsNotifications;
    }
    await this.userModel.updateOne(
      { userId },
      { $set: set },
      { upsert: true },
    );
    return { ok: true };
  }

  @Post('reminder-settings')
  async saveReminderSettings(
    @Body()
    body: {
      userId: number;
      reminderSettings: {
        enabled: boolean;
        time: 'morning' | 'afternoon' | 'evening';
        allowsNotifications?: boolean;
      };
    },
  ) {
    const { userId, reminderSettings } = body;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }
    if (!reminderSettings || typeof reminderSettings !== 'object') {
      throw new BadRequestException('reminderSettings is required');
    }
    const { enabled, time, allowsNotifications } = reminderSettings;
    if (typeof enabled !== 'boolean') {
      throw new BadRequestException('reminderSettings.enabled must be boolean');
    }
    if (!this.allowedReminderTimes.includes(time as any)) {
      throw new BadRequestException("reminderSettings.time must be 'morning' | 'afternoon' | 'evening'");
    }

    const set: Record<string, any> = {
      reminderSettings: { enabled, time },
    };
    if (typeof allowsNotifications === 'boolean') {
      set.notificationsAllowed = allowsNotifications;
    }
    await this.userModel.updateOne(
      { userId },
      { $set: set },
      { upsert: true },
    );
    return { ok: true };
  }
}


