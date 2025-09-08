import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProgressService } from './progress.service';
import { DailyStat, DailyStatDocument } from '../common/schemas/daily-stat.schema';
import { XpTransaction, XpTransactionDocument } from '../common/schemas/xp-transaction.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';

import { OnboardingGuard } from '../auth/onboarding.guard';

@Controller('progress')
@UseGuards(OnboardingGuard)
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    @InjectModel(DailyStat.name) private readonly dailyModel: Model<DailyStatDocument>,
    @InjectModel(XpTransaction.name) private readonly xpModel: Model<XpTransactionDocument>,
    @InjectModel(UserLessonProgress.name) private readonly ulpModel: Model<UserLessonProgressDocument>,
  ) {}

  @Post('sessions/start')
  async startSession(
    @Body() body: { userId: string; moduleRef?: string; lessonRef?: string; source?: 'reminder' | 'home' | 'deeplink' | 'unknown' },
  ) {
    const session = await this.progress.startSession(body.userId, { moduleRef: body.moduleRef, lessonRef: body.lessonRef, source: body.source });
    return { sessionId: (session as any)._id };
  }

  @Post('sessions/:sessionId/end')
  async endSession(@Param('sessionId') sessionId: string, @Body() body: { extraXp?: number }) {
    const session = await this.progress.endSession(sessionId, body?.extraXp || 0);
    return { ok: Boolean(session) };
  }

  @Post('attempts')
  async attempt(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body()
    body: {
      userId: string;
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
      userAnswer?: string;
      correctAnswer?: string;
    },
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const attempt = await this.progress.recordTaskAttempt({
      userId: body.userId,
      lessonRef: body.lessonRef,
      taskRef: body.taskRef,
      isCorrect: body.isCorrect,
      score: body.score,
      durationMs: body.durationMs,
      variantKey: body.variantKey,
      sessionId: body.sessionId,
      clientAttemptId: idempotencyKey, // Используем заголовок как clientAttemptId
      lastTaskIndex: body.lastTaskIndex,
      isLastTask: body.isLastTask,
      userAnswer: body.userAnswer,
      correctAnswer: body.correctAnswer,
    });
    return { attemptId: (attempt as any)._id };
  }

  @Get('stats/daily/:userId')
  async daily(@Param('userId') userId: string, @Query('limit') limit = '14') {
    const items = await this.dailyModel
      .find({ userId: String(userId) })
      .sort({ dayKey: -1 })
      .limit(Number(limit))
      .lean();
    return { items };
  }

  @Get('xp/:userId')
  async xp(@Param('userId') userId: string, @Query('limit') limit = '50') {
    const items = await this.xpModel
      .find({ userId: String(userId) })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    return { items };
  }

  @Get('lessons/:userId')
  async lessons(@Param('userId') userId: string, @Query('status') status?: 'not_started' | 'in_progress' | 'completed') {
    const query: any = { userId: String(userId) };
    if (status) query.status = status;
    const items = await this.ulpModel.find(query).sort({ updatedAt: -1 }).limit(100).lean();
    return { items };
  }
}


