import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { UserTaskAttempt, UserTaskAttemptDocument } from '../common/schemas/user-task-attempt.schema';
import { XpTransaction, XpTransactionDocument, XpSource } from '../common/schemas/xp-transaction.schema';
import { DailyStat, DailyStatDocument } from '../common/schemas/daily-stat.schema';
import { LearningSession, LearningSessionDocument } from '../common/schemas/learning-session.schema';
import { Achievement, AchievementDocument } from '../common/schemas/achievement.schema';

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(UserLessonProgress.name) private readonly ulpModel: Model<UserLessonProgressDocument>,
    @InjectModel(UserTaskAttempt.name) private readonly attemptModel: Model<UserTaskAttemptDocument>,
    @InjectModel(XpTransaction.name) private readonly xpModel: Model<XpTransactionDocument>,
    @InjectModel(DailyStat.name) private readonly dailyModel: Model<DailyStatDocument>,
    @InjectModel(LearningSession.name) private readonly sessionModel: Model<LearningSessionDocument>,
    @InjectModel(Achievement.name) private readonly achModel: Model<AchievementDocument>,
  ) {}

  private getDayKey(date: Date, tz: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .reduce<Record<string, string>>((acc, p) => {
        acc[p.type] = p.value;
        return acc;
      }, {} as any);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  async addXp(userId: number, delta: number, source: XpSource, ref?: string, sessionId?: string, meta?: Record<string, any>) {
    if (!delta) return;
    await this.xpModel.create({ userId, delta, source, ref, sessionId, meta });
    await this.userModel.updateOne({ userId }, { $inc: { xpTotal: delta } });
  }

  async updateStreakOnActivity(userId: number, activityDate = new Date()): Promise<number> {
    const user = await this.userModel.findOne({ userId }).lean();
    if (!user) return 0;
    const tz = user.tz || 'UTC';
    const todayKey = this.getDayKey(activityDate, tz);
    const streak = (user as any).streak || { current: 0, longest: 0, lastActiveDayKey: undefined };
    if (streak.lastActiveDayKey === todayKey) return streak.current;
    const yesterday = new Date(activityDate);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yKey = this.getDayKey(yesterday, tz);
    const next = streak.lastActiveDayKey === yKey ? streak.current + 1 : 1;
    const longest = Math.max(streak.longest || 0, next);
    await this.userModel.updateOne(
      { userId },
      { $set: { 'streak.lastActiveDayKey': todayKey, 'streak.current': next, 'streak.longest': longest } },
    );
    return next;
  }

  async startSession(userId: number, params: { moduleRef?: string; lessonRef?: string; source?: 'reminder' | 'home' | 'deeplink' | 'unknown' } = {}) {
    const session = await this.sessionModel.create({ userId, moduleRef: params.moduleRef, lessonRef: params.lessonRef, source: params.source || 'unknown', startedAt: new Date() });
    return session;
  }

  async endSession(sessionId: string, extraXp = 0) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) return null;
    session.endedAt = new Date();
    if (extraXp) session.xpEarned = (session.xpEarned || 0) + extraXp;
    await session.save();
    return session;
  }

  async recordTaskAttempt(args: {
    userId: number;
    lessonRef: string;
    taskRef: string;
    isCorrect: boolean;
    score?: number;
    durationMs?: number;
    variantKey?: string;
    sessionId?: string;
    clientAttemptId?: string;
    lastTaskIndex?: number;
    isLastTask?: boolean;
    xpPerCorrect?: number;
  }) {
    const xpPerCorrect = args.xpPerCorrect ?? 10;

    // Ensure ULP exists
    const ulp = await this.ulpModel.findOneAndUpdate(
      { userId: args.userId, lessonRef: args.lessonRef },
      {
        $setOnInsert: {
          userId: args.userId,
          lessonRef: args.lessonRef,
          status: 'in_progress',
          startedAt: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    // Next attempt number
    const last = await this.attemptModel
      .findOne({ userId: args.userId, lessonRef: args.lessonRef, taskRef: args.taskRef })
      .sort({ attemptNo: -1 })
      .lean();
    const attemptNo = ((last as any)?.attemptNo || 0) + 1;

    // Create attempt
    const attempt = await this.attemptModel.create({
      userId: args.userId,
      lessonRef: args.lessonRef,
      taskRef: args.taskRef,
      attemptNo,
      correct: args.isCorrect,
      score: args.score,
      durationMs: args.durationMs,
      variantKey: args.variantKey,
      sessionId: args.sessionId,
      clientAttemptId: args.clientAttemptId,
      source: 'lesson',
    });

    // Update ULP
    await this.ulpModel.updateOne({ _id: ulp._id }, { $inc: { attempts: 1 }, $set: { lastTaskIndex: args.lastTaskIndex } });

    // XP
    if (args.isCorrect) {
      await this.addXp(args.userId, xpPerCorrect, 'task', args.taskRef, args.sessionId, { lessonRef: args.lessonRef });
    }

    // Daily
    const user = await this.userModel.findOne({ userId: args.userId }).lean();
    const tz = user?.tz || 'UTC';
    const dayKey = this.getDayKey(new Date(), tz);

    if (args.isLastTask) {
      await this.ulpModel.updateOne({ _id: ulp._id }, { $set: { status: 'completed', completedAt: new Date() } });
      await this.addXp(args.userId, 20, 'lesson_complete', args.lessonRef, args.sessionId);
      const newStreak = await this.updateStreakOnActivity(args.userId);
      await this.dailyModel.updateOne(
        { userId: args.userId, dayKey },
        { $inc: { xpEarned: (args.isCorrect ? xpPerCorrect : 0) + 20, lessonsCompleted: 1 }, $setOnInsert: { tz } },
        { upsert: true },
      );
      if ([3, 7].includes(newStreak)) {
        await this.addXp(args.userId, 15, 'streak_bonus', `streak_${newStreak}`, args.sessionId);
      }
    } else {
      await this.dailyModel.updateOne(
        { userId: args.userId, dayKey },
        { $inc: { xpEarned: args.isCorrect ? xpPerCorrect : 0, tasksCompleted: 1 }, $setOnInsert: { tz } },
        { upsert: true },
      );
    }

    return attempt;
  }
}


