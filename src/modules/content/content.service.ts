import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CourseModule, CourseModuleDocument } from '../common/schemas/course-module.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(CourseModule.name) private readonly moduleModel: Model<CourseModuleDocument>,
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
  ) {}

  // Modules
  async createModule(body: { moduleRef: string; level: CourseModule['level']; title: string; description?: string; tags?: string[]; order?: number; published?: boolean }) {
    return this.moduleModel.create(body);
  }

  async listModules(level?: CourseModule['level']) {
    const q: any = {};
    if (level) q.level = level;
    return this.moduleModel.find(q).sort({ level: 1, order: 1 }).lean();
  }

  async updateModule(moduleRef: string, update: Partial<CourseModule>) {
    await this.moduleModel.updateOne({ moduleRef }, { $set: update });
    return { ok: true };
  }

  // Lessons
  async createLesson(body: { moduleRef: string; lessonRef: string; title: string; description?: string; estimatedMinutes?: number; tasks?: Array<{ ref: string; type: string; data: Record<string, any> }>; order?: number; published?: boolean }) {
    return this.lessonModel.create(body);
  }

  async listLessons(moduleRef?: string) {
    const q: any = {};
    if (moduleRef) q.moduleRef = moduleRef;
    return this.lessonModel.find(q).sort({ moduleRef: 1, order: 1 }).lean();
  }

  async updateLesson(lessonRef: string, update: Partial<Lesson>) {
    await this.lessonModel.updateOne({ lessonRef }, { $set: update });
    return { ok: true };
  }
}


