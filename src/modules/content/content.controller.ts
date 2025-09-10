import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TelegramAuthGuard } from '../common/guards/telegram-auth.guard';
import { OptionalUserGuard } from '../common/guards/optional-user.guard';
import { CourseModule, CourseModuleDocument } from '../common/schemas/course-module.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';
import { User, UserDocument } from '../common/schemas/user.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { getLocalizedText, parseLanguage } from '../common/utils/i18n.util';
import { ModuleMapper, LessonMapper, LessonProgressMapper } from '../common/utils/mappers';
import { GetModulesDto, GetLessonsDto, GetLessonDto } from './dto/get-content.dto';

@Controller('content')
@UseGuards(OptionalUserGuard)
export class ContentController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(CourseModule.name) private readonly moduleModel: Model<CourseModuleDocument>,
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
    @InjectModel(UserLessonProgress.name) private readonly ulpModel: Model<UserLessonProgressDocument>,
  ) {}

  @Get('modules')
  @UseGuards(TelegramAuthGuard)
  async getModules(@Query() query: GetModulesDto) {
    const { userId, level, lang } = query;
    const language = parseLanguage(lang);
    const filter: any = { published: true };
    if (level) filter.level = level;

    // 🔒 ДОПОЛНИТЕЛЬНАЯ ВАЛИДАЦИЯ moduleRef (если есть)
    if (level && !['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level)) {
      return { error: 'Invalid level' };
    }
    
    const modules = await this.moduleModel
      .find(filter)
      .sort({ level: 1, order: 1 })
      .lean();

    // Enrich with progress and access rights if userId provided
    if (userId) {
      const user = await this.userModel.findOne({ userId: String(userId) }).lean();
      const hasProAccess = user?.pro?.active === true;
      
      const progressMap = new Map();
      const progress = await this.ulpModel
        .find({ userId: String(userId) })
        .lean();
      
      for (const p of progress) {
        // Используем денормализованный moduleRef или вычисляем из lessonRef
        const moduleRef = (p as any).moduleRef || (p as any).lessonRef?.split('.').slice(0, 2).join('.');
        if (!progressMap.has(moduleRef)) {
          progressMap.set(moduleRef, { completed: 0, total: 0, inProgress: 0 });
        }
        const stats = progressMap.get(moduleRef);
        stats.total++;
        if ((p as any).status === 'completed') stats.completed++;
        if ((p as any).status === 'in_progress') stats.inProgress++;
      }

      return {
        modules: modules.map((m: any) => {
          const order = m.order || 0;
          const requiresPro = m.requiresPro || order > 1; // Use schema field or business rule
          const isAvailable = m.isAvailable ?? (!requiresPro || hasProAccess);

          return ModuleMapper.toDto(m, String(userId), language, progressMap.get(m.moduleRef));
        }),
      };
    }

    // Fallback for anonymous access
    return {
      modules: modules.map((m: any) => {
        const order = m.order || 0;
        const requiresPro = m.requiresPro || order > 1;
        const isAvailable = m.isAvailable ?? !requiresPro; // Anonymous user never has pro access
        
        return ModuleMapper.toDto(m, '', language, undefined);
      }),
    };
  }

  @Get('lessons')
  @UseGuards(TelegramAuthGuard)
  async getLessons(@Query() query: GetLessonsDto) {
    const { userId, moduleRef, lang } = query;
    const language = parseLanguage(lang);
    const filter: any = { published: true };
    if (moduleRef) {
      // 🔒 БАЗОВАЯ ВАЛИДАЦИЯ moduleRef
      if (!/^[a-z0-9]+\.[a-z0-9_]+$/.test(moduleRef)) {
        return { error: 'Invalid moduleRef format' };
      }
      filter.moduleRef = moduleRef;
    }
    
    const lessons = await this.lessonModel
      .find(filter, { tasks: 0 }) // exclude tasks for list view
      .sort({ moduleRef: 1, order: 1 })
      .lean();

    // Enrich with progress if userId provided
    if (userId) {
      const progressMap = new Map();
      const progress = await this.ulpModel
        .find({ userId: String(userId), ...(moduleRef ? { lessonRef: { $regex: `^${moduleRef}\\.` } } : {}) })
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
        lessons: lessons.map((l: any) => {
          const progress = progressMap.get(l.lessonRef);
          return LessonMapper.toDto(l, language, progress ? LessonProgressMapper.toDto(progress) : undefined);
        }),
      };
    }

    return {
      lessons: lessons.map((l: any) => LessonMapper.toDto(l, language)),
    };
  }

  @Get('lessons/:lessonRef')
  @UseGuards(TelegramAuthGuard)
  async getLesson(@Param('lessonRef') lessonRef: string, @Query() query: GetLessonDto) {
    const { userId, lang } = query;
    const language = parseLanguage(lang);

    // 🔒 БАЗОВАЯ ВАЛИДАЦИЯ lessonRef
    if (!/^[a-z0-9]+\.[a-z0-9_]+\.\d{3}$/.test(lessonRef)) {
      return { error: 'Invalid lessonRef format' };
    }

    const lesson = await this.lessonModel.findOne({ lessonRef, published: true }).lean();
    if (!lesson) {
      return { error: 'Lesson not found' };
    }

    let progress = null;
    if (userId) {
      progress = await this.ulpModel.findOne({ userId: String(userId), lessonRef }).lean();
    }

    return {
      lesson: LessonMapper.toDto(
        lesson as any, 
        language, 
        progress ? LessonProgressMapper.toDto(progress as any) : undefined,
        (lesson as any).tasks?.map((t: any) => t.type)
      ),
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
  @UseGuards(TelegramAuthGuard)
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
  @UseGuards(TelegramAuthGuard)
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


