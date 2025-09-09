// src/content/content-v2.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseModule, CourseModuleDocument } from '../common/schemas/course-module.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';
import { presentLesson, presentModule } from './presenter';

@Controller('content/v2')
export class ContentV2Controller {
  constructor(
    @InjectModel(CourseModule.name) private moduleModel: Model<CourseModuleDocument>,
    @InjectModel(Lesson.name) private lessonModel: Model<LessonDocument>,
    @InjectModel(UserLessonProgress.name) private progressModel: Model<UserLessonProgressDocument>,
  ) {}

  @Get('modules')
  async getModules(@Query('userId') userId: string, @Query('lang') lang = 'ru') {
    const modules = await this.moduleModel.find({ published: true }).sort({ level: 1, order: 1 }).lean();
    // для каждого модуля посчитаем прогресс пользователя
    const lessonCounts = await this.lessonModel.aggregate([
      { $match: { published: true } },
      { $group: { _id: '$moduleRef', total: { $sum: 1 } } },
    ]);

    const countsMap = new Map(lessonCounts.map((x: any) => [x._id, x.total]));
    let progresses = new Map<string, { completed: number; inProgress: number }>();

    if (userId) {
      const byModule = await this.progressModel.aggregate([
        { $match: { userId } },
        { $group: {
          _id: '$moduleRef',
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        } },
      ]);
      progresses = new Map(byModule.map((x: any) => [x._id, { completed: x.completed, inProgress: x.inProgress }]));
    }

    return modules.map(m => {
      const total = countsMap.get(m.moduleRef) || 0;
      const pr = progresses.get(m.moduleRef) || { completed: 0, inProgress: 0 };
      return presentModule(m as any, lang, { completed: pr.completed, inProgress: pr.inProgress, total });
    });
  }

  @Get('modules/:moduleRef/lessons')
  async getLessons(@Param('moduleRef') moduleRef: string, @Query('userId') userId: string, @Query('lang') lang = 'ru') {
    const lessons = await this.lessonModel.find({ moduleRef, published: true }).sort({ order: 1 }).lean();
    const progresses = userId
      ? await this.progressModel.find({ userId, moduleRef }).lean()
      : [];

    const progressMap = new Map(progresses.map((p: any) => [p.lessonRef, p]));
    return lessons.map(l => presentLesson(l as any, lang, progressMap.get(l.lessonRef)));
  }

  @Get('lessons/:lessonRef')
  async getLesson(@Param('lessonRef') lessonRef: string, @Query('userId') userId: string, @Query('lang') lang = 'ru') {
    const l = await this.lessonModel.findOne({ lessonRef, published: true }).lean();
    if (!l) return null;
    const p = userId ? await this.progressModel.findOne({ userId, lessonRef }).lean() : null;
    // detailed: вернём ещё tasks
    const presented = presentLesson(l as any, lang, p as any);
    (presented as any).tasks = l.tasks || [];
    return presented;
  }
}
