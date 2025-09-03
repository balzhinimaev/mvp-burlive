import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { OnboardingGuard } from '../auth/onboarding.guard';
import { CreateModuleDto, UpdateModuleDto } from './dto/module.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { lintLessonTasks } from './utils/task-lint';

@Controller('admin/content')
@UseGuards(OnboardingGuard)
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  // Modules
  @Post('modules')
  async createModule(@Body() body: CreateModuleDto) {
    const { userId, ...data } = body;
    const doc = await this.content.createModule(data as any);
    return { id: (doc as any)._id };
  }

  @Get('modules')
  async listModules(@Query('level') level?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') {
    const items = await this.content.listModules(level);
    return { items };
  }

  @Patch('modules/:moduleRef')
  async updateModule(@Param('moduleRef') moduleRef: string, @Body() body: UpdateModuleDto) {
    const { userId, ...update } = body;
    return this.content.updateModule(moduleRef, update as any);
  }

  // Lessons
  @Post('lessons')
  async createLesson(@Body() body: CreateLessonDto) {
    const { userId, ...data } = body as any;
    const errors = lintLessonTasks(data.lessonRef, data.tasks);
    if (errors.length) {
      return { ok: false, errors };
    }
    const doc = await this.content.createLesson(data as any);
    return { id: (doc as any)._id };
  }

  @Get('lessons')
  async listLessons(@Query('moduleRef') moduleRef?: string) {
    const items = await this.content.listLessons(moduleRef);
    return { items };
  }

  @Patch('lessons/:lessonRef')
  async updateLesson(@Param('lessonRef') lessonRef: string, @Body() body: UpdateLessonDto) {
    const { userId, ...update } = body as any;
    const errors = lintLessonTasks(lessonRef, update.tasks);
    if (errors.length) {
      return { ok: false, errors };
    }
    return this.content.updateLesson(lessonRef, update as any);
  }
}


