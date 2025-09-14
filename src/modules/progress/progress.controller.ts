import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards, BadRequestException, Request } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProgressService } from './progress.service';
import { AnswerValidatorService } from './answer-validator.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { DailyStat, DailyStatDocument } from '../common/schemas/daily-stat.schema';
import { XpTransaction, XpTransactionDocument } from '../common/schemas/xp-transaction.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(
    private readonly progress: ProgressService,
    private readonly validator: AnswerValidatorService,
    @InjectModel(DailyStat.name) private readonly dailyModel: Model<DailyStatDocument>,
    @InjectModel(XpTransaction.name) private readonly xpModel: Model<XpTransactionDocument>,
    @InjectModel(UserLessonProgress.name) private readonly ulpModel: Model<UserLessonProgressDocument>,
  ) {}

  @Post('sessions/start')
  async startSession(
    @Body() body: { moduleRef?: string; lessonRef?: string; source?: 'reminder' | 'home' | 'deeplink' | 'unknown' },
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    const session = await this.progress.startSession(userId, { moduleRef: body.moduleRef, lessonRef: body.lessonRef, source: body.source });
    return { sessionId: (session as any)._id };
  }

  @Post('sessions/:sessionId/end')
  async endSession(@Param('sessionId') sessionId: string, @Body() body: { extraXp?: number }) {
    const session = await this.progress.endSession(sessionId, body?.extraXp || 0);
    return { ok: Boolean(session) };
  }

  // 🔒 НОВЫЙ БЕЗОПАСНЫЙ ЭНДПОИНТ
  @Post('submit-answer')
  async submitAnswer(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: SubmitAnswerDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    try {
      // 🔒 ВАЛИДАЦИЯ НА СЕРВЕРЕ
      const validation = await this.validator.validateAnswer(
        body.lessonRef,
        body.taskRef,
        body.userAnswer
      );

      // Записываем попытку с результатом валидации
      const attempt = await this.progress.recordTaskAttempt({
        userId: userId,
        lessonRef: body.lessonRef,
        taskRef: body.taskRef,
        isCorrect: validation.isCorrect,
        score: validation.score,
        durationMs: body.durationMs,
        variantKey: body.variantKey,
        sessionId: body.sessionId,
        clientAttemptId: idempotencyKey,
        lastTaskIndex: body.lastTaskIndex,
        isLastTask: body.isLastTask,
        userAnswer: body.userAnswer,
        correctAnswer: validation.correctAnswer,
      });

      return {
        attemptId: (attempt as any)._id,
        isCorrect: validation.isCorrect,
        score: validation.score,
        feedback: validation.feedback,
        correctAnswer: validation.correctAnswer, // Показываем ПОСЛЕ ответа
        explanation: validation.explanation,
      };
    } catch (error) {
      console.error('Answer validation error:', error);
      return {
        isCorrect: false,
        score: 0,
        feedback: 'An error occurred while checking your answer',
      };
    }
  }

  // 🚨 СТАРЫЙ НЕБЕЗОПАСНЫЙ ЭНДПОИНТ (для обратной совместимости)
  @Post('attempts')
  async attempt(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body()
    body: {
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
    @Request() req: any,
  ) {
    const userId = req.user?.userId; // Get userId from JWT token
    console.warn(`⚠️ SECURITY WARNING: Using deprecated /attempts endpoint for ${body.taskRef}`);
    
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const attempt = await this.progress.recordTaskAttempt({
      userId: userId,
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

  @Get('stats/daily')
  async daily(@Query('limit') limit = '14', @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const items = await this.dailyModel
      .find({ userId: String(userId) })
      .sort({ dayKey: -1 })
      .limit(Number(limit))
      .lean();
    return { items };
  }

  @Get('xp')
  async xp(@Query('limit') limit = '50', @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const items = await this.xpModel
      .find({ userId: String(userId) })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    return { items };
  }

  @Get('lessons')
  async lessons(@Request() req?: any, @Query() queryParams?: { status?: 'not_started' | 'in_progress' | 'completed' }) {
    const { status } = queryParams || {};
    const userId = req?.user?.userId; // Get userId from JWT token
    const dbQuery: any = { userId: String(userId) };
    if (status) dbQuery.status = status;
    const items = await this.ulpModel.find(dbQuery).sort({ updatedAt: -1 }).limit(100).lean();
    return { items };
  }
}


