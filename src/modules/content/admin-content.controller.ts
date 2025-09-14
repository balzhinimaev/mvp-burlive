import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateModuleDto, UpdateModuleDto } from './dto/module.dto';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { lintLessonTasks } from './utils/task-lint';

@Controller('admin/content')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  // Modules
  @Post('modules')
  async createModule(@Body() body: CreateModuleDto, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const doc = await this.content.createModule(body as any);
    return { id: (doc as any)._id };
  }

  @Get('modules')
  async listModules(@Query('level') level?: 'A0' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') {
    const items = await this.content.listModules(level);
    return { items };
  }

  @Patch('modules/:moduleRef')
  async updateModule(@Param('moduleRef') moduleRef: string, @Body() body: UpdateModuleDto, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    return this.content.updateModule(moduleRef, body as any);
  }

  // Lessons
  @Post('lessons')
  async createLesson(@Body() body: CreateLessonDto, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const errors = lintLessonTasks(body.lessonRef, body.tasks);
    if (errors.length) {
      return { ok: false, errors };
    }
    const doc = await this.content.createLesson(body as any);
    return { id: (doc as any)._id };
  }

  @Get('lessons')
  async listLessons(@Query('moduleRef') moduleRef?: string) {
    const items = await this.content.listLessons(moduleRef);
    return { items };
  }

  @Patch('lessons/:lessonRef')
  async updateLesson(@Param('lessonRef') lessonRef: string, @Body() body: UpdateLessonDto, @Request() req: any) {
    const userId = req.user?.userId; // Get userId from JWT token
    const errors = lintLessonTasks(lessonRef, body.tasks);
    if (errors.length) {
      return { ok: false, errors };
    }
    return this.content.updateLesson(lessonRef, body as any);
  }
}


