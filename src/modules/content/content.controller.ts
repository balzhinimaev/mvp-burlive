import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OnboardingGuard } from '../auth/onboarding.guard';
import { CourseModule, CourseModuleDocument } from '../common/schemas/course-module.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { getLocalizedText, parseLanguage } from '../common/utils/i18n.util';

@Controller('content')
export class ContentController {
  constructor(
    @InjectModel(CourseModule.name) private readonly moduleModel: Model<CourseModuleDocument>,
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    @InjectModel(UserLessonProgress.name) private readonly ulpModel: Model<UserLessonProgressDocument>,
  ) {}

  @Get('modules')
  @UseGuards(OnboardingGuard)
  async getModules(@Query('level') level?: string, @Query('userId') userId?: string, @Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const filter: any = { published: true };
    if (level) filter.level = level;
    
    const modules = await this.moduleModel
      .find(filter)
      .sort({ level: 1, order: 1 })
      .lean();

    // Enrich with progress if userId provided
    if (userId) {
      const progressMap = new Map();
      const progress = await this.ulpModel
        .find({ userId: Number(userId) })
        .lean();
      
      for (const p of progress) {
        const moduleRef = (p as any).lessonRef?.split('.').slice(0, 2).join('.');
        if (!progressMap.has(moduleRef)) {
          progressMap.set(moduleRef, { completed: 0, total: 0, inProgress: 0 });
        }
        const stats = progressMap.get(moduleRef);
        stats.total++;
        if ((p as any).status === 'completed') stats.completed++;
        if ((p as any).status === 'in_progress') stats.inProgress++;
      }

      return {
        modules: modules.map((m: any) => ({
          moduleRef: m.moduleRef,
          level: m.level,
          title: getLocalizedText(m.title, language),
          description: getLocalizedText(m.description, language),
          tags: m.tags || [],
          order: m.order || 0,
          progress: progressMap.get(m.moduleRef) || { completed: 0, total: 0, inProgress: 0 },
        })),
      };
    }

    return {
      modules: modules.map((m: any) => ({
        moduleRef: m.moduleRef,
        level: m.level,
        title: getLocalizedText(m.title, language),
        description: getLocalizedText(m.description, language),
        tags: m.tags || [],
        order: m.order || 0,
      })),
    };
  }

  @Get('lessons')
  @UseGuards(OnboardingGuard)
  async getLessons(@Query('moduleRef') moduleRef?: string, @Query('userId') userId?: string, @Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const filter: any = { published: true };
    if (moduleRef) filter.moduleRef = moduleRef;
    
    const lessons = await this.lessonModel
      .find(filter, { tasks: 0 }) // exclude tasks for list view
      .sort({ moduleRef: 1, order: 1 })
      .lean();

    // Enrich with progress if userId provided
    if (userId) {
      const progressMap = new Map();
      const progress = await this.ulpModel
        .find({ userId: Number(userId), ...(moduleRef ? { lessonRef: { $regex: `^${moduleRef}\\.` } } : {}) })
        .lean();
      
      for (const p of progress) {
        progressMap.set((p as any).lessonRef, {
          status: (p as any).status,
          score: (p as any).score || 0,
          attempts: (p as any).attempts || 0,
          completedAt: (p as any).completedAt,
        });
      }

      return {
        lessons: lessons.map((l: any) => ({
          lessonRef: l.lessonRef,
          moduleRef: l.moduleRef,
          title: getLocalizedText(l.title, language),
          description: getLocalizedText(l.description, language),
          estimatedMinutes: l.estimatedMinutes || 10,
          order: l.order || 0,
          progress: progressMap.get(l.lessonRef) || { status: 'not_started', score: 0, attempts: 0 },
        })),
      };
    }

    return {
      lessons: lessons.map((l: any) => ({
        lessonRef: l.lessonRef,
        moduleRef: l.moduleRef,
        title: getLocalizedText(l.title, language),
        description: getLocalizedText(l.description, language),
        estimatedMinutes: l.estimatedMinutes || 10,
        order: l.order || 0,
      })),
    };
  }

  @Get('lessons/:lessonRef')
  @UseGuards(OnboardingGuard)
  async getLesson(@Param('lessonRef') lessonRef: string, @Query('userId') userId?: string, @Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const lesson = await this.lessonModel.findOne({ lessonRef, published: true }).lean();
    if (!lesson) {
      return { error: 'Lesson not found' };
    }

    let progress = null;
    if (userId) {
      progress = await this.ulpModel.findOne({ userId: Number(userId), lessonRef }).lean();
    }

    return {
      lesson: {
        lessonRef: (lesson as any).lessonRef,
        moduleRef: (lesson as any).moduleRef,
        title: getLocalizedText((lesson as any).title, language),
        description: getLocalizedText((lesson as any).description, language),
        estimatedMinutes: (lesson as any).estimatedMinutes || 10,
        order: (lesson as any).order || 0,
        tasks: (lesson as any).tasks || [],
        progress: progress ? {
          status: (progress as any).status,
          score: (progress as any).score || 0,
          attempts: (progress as any).attempts || 0,
          lastTaskIndex: (progress as any).lastTaskIndex,
          completedAt: (progress as any).completedAt,
        } : { status: 'not_started', score: 0, attempts: 0 },
      },
    };
  }

  @Get('onboarding')
  onboarding(@Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const content = {
      title: {
        ru: 'Добро пожаловать в изучение английского!',
        en: 'Welcome to English Learning!'
      },
      description: {
        ru: 'Начните свой 7-дневный курс английского: словарный запас, грамматика, аудирование и разговорная практика.',
        en: 'Start your 7-day English course: vocabulary, grammar, listening, and speaking practice.'
      }
    };

    return { 
      title: getLocalizedText(content.title, language), 
      description: getLocalizedText(content.description, language) 
    };
  }

  @Get('lesson1')
  @UseGuards(OnboardingGuard)
  lesson1(@Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const content = {
      title: {
        ru: 'Приветствие и знакомство',
        en: 'Hello & Greetings'
      }
    };

    return { 
      id: 1, 
      title: getLocalizedText(content.title, language), 
      level: 'A1',
      skillType: 'vocabulary',
      durationMin: 8,
      content: {
        vocabulary: ['Hello', 'Hi', 'Good morning', 'Good evening', 'How are you?', 'Nice to meet you'],
        phrases: [
          { english: 'Hello, how are you?', translation: 'Привет, как дела?' },
          { english: 'Nice to meet you', translation: 'Приятно познакомиться' },
          { english: 'Good morning', translation: 'Доброе утро' }
        ]
      }
    };
  }

  @Get('paywall')
  @UseGuards(OnboardingGuard)
  paywall(@Query('lang') lang?: string) {
    const language = parseLanguage(lang);
    const content = {
      title: {
        ru: 'Откройте полный курс английского',
        en: 'Unlock Full English Course'
      },
      description: {
        ru: 'Получите доступ ко всем урокам, упражнениям и расширенным функциям',
        en: 'Get access to all lessons, exercises, and advanced features'
      },
      products: [
        {
          id: 'monthly',
          name: {
            ru: 'Месячный план',
            en: 'Monthly Plan'
          },
          features: {
            ru: ['Все уроки A1-C2', 'Разговорная практика', 'Упражнения по грамматике', 'Отслеживание прогресса'],
            en: ['All lessons A1-C2', 'Speaking practice', 'Grammar exercises', 'Progress tracking']
          }
        },
        {
          id: 'quarterly',
          name: {
            ru: 'Квартальный план',
            en: 'Quarterly Plan'
          },
          features: {
            ru: ['Все уроки A1-C2', 'Разговорная практика', 'Упражнения по грамматике', 'Отслеживание прогресса', 'Скидка 15%'],
            en: ['All lessons A1-C2', 'Speaking practice', 'Grammar exercises', 'Progress tracking', '15% discount']
          }
        }
      ]
    };

    return {
      title: getLocalizedText(content.title, language),
      description: getLocalizedText(content.description, language),
      products: content.products.map(product => ({
        id: product.id,
        name: getLocalizedText(product.name, language),
        priceRub: product.id === 'monthly' ? 99 : 249,
        durationDays: product.id === 'monthly' ? 30 : 90,
        features: (product.features as any)[language] || (product.features as any).en || []
      }))
    };
  }
}


