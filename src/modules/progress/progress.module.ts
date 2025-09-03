import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { User, UserSchema } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressSchema } from '../common/schemas/user-lesson-progress.schema';
import { UserTaskAttempt, UserTaskAttemptSchema } from '../common/schemas/user-task-attempt.schema';
import { XpTransaction, XpTransactionSchema } from '../common/schemas/xp-transaction.schema';
import { DailyStat, DailyStatSchema } from '../common/schemas/daily-stat.schema';
import { LearningSession, LearningSessionSchema } from '../common/schemas/learning-session.schema';
import { Achievement, AchievementSchema } from '../common/schemas/achievement.schema';
import { AuthModule } from '../auth/auth.module';
import { SessionCleanupService } from './session-cleanup.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserLessonProgress.name, schema: UserLessonProgressSchema },
      { name: UserTaskAttempt.name, schema: UserTaskAttemptSchema },
      { name: XpTransaction.name, schema: XpTransactionSchema },
      { name: DailyStat.name, schema: DailyStatSchema },
      { name: LearningSession.name, schema: LearningSessionSchema },
      { name: Achievement.name, schema: AchievementSchema },
    ]),
  ],
  controllers: [ProgressController],
  providers: [ProgressService, SessionCleanupService],
  exports: [ProgressService],
})
export class ProgressModule {}


