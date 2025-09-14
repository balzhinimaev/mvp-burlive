import { Body, Controller, Get, Param, Patch, Post, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Allowed values are defined at module scope to avoid referencing `this` in type annotations
const ALLOWED_GOALS = [
  'work_career',
  'study_exams',
  'travel',
  'communication',
  'entertainment',
  'relocation',
  'curiosity',
] as const;
type AllowedGoal = (typeof ALLOWED_GOALS)[number];

const ALLOWED_REMINDER_TIMES = ['morning', 'afternoon', 'evening'] as const;
type ReminderTime = (typeof ALLOWED_REMINDER_TIMES)[number];

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  @Get()
  async get(@Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const user = await this.userModel.findOne({ userId: String(userId) }).lean();
    return { user };
  }

  @Patch()
  async update(
    @Body()
    body: {
      firstName?: string;
      lastName?: string;
      username?: string;
      languageCode?: string;
      photoUrl?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    await this.userModel.updateOne({ userId }, { $set: body }, { upsert: true });
    return { ok: true };
  }

  @Patch('onboarding/complete')
  async completeOnboarding(
    @Body()
    body: {
      // Backward compatibility: keep englishLevel, but also accept new proficiencyLevel
      englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
      proficiencyLevel?: 'beginner' | 'intermediate' | 'advanced';
      learningGoals?: string[];
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    const { englishLevel, proficiencyLevel, learningGoals } = body;

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
  private readonly allowedGoals = ALLOWED_GOALS;

  private readonly allowedReminderTimes = ALLOWED_REMINDER_TIMES;

  private isValidDailyGoal(value: number): value is 5 | 10 | 15 | 20 {
    return [5, 10, 15, 20].includes(value);
  }

  @Post('learning-goals')
  async saveLearningGoals(
    @Body()
    body: {
      goals: AllowedGoal[];
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    const { goals } = body;
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
      dailyGoalMinutes: 5 | 10 | 15 | 20;
      allowsNotifications?: boolean;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    const { dailyGoalMinutes, allowsNotifications } = body;
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
      reminderSettings: {
        enabled: boolean;
        time: 'morning' | 'afternoon' | 'evening';
        allowsNotifications?: boolean;
      };
    },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    const { reminderSettings } = body;
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


