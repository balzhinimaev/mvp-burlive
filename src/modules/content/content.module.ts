import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from './content.controller';
import { ContentV2Controller } from './content-v2.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';
import { CourseModule, CourseModuleSchema } from '../common/schemas/course-module.schema';
import { Lesson, LessonSchema } from '../common/schemas/lesson.schema';
import { ContentService } from './content.service';
import { AdminContentController } from './admin-content.controller';
import { TelegramAuthGuard } from '../common/guards/telegram-auth.guard';
import { OptionalUserGuard } from '../common/guards/optional-user.guard';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: CourseModule.name, schema: CourseModuleSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: 'UserLessonProgress', schema: require('../common/schemas/user-lesson-progress.schema').UserLessonProgressSchema },
    ]),
  ],
  controllers: [ContentController, ContentV2Controller, AdminContentController],
  providers: [ContentService, TelegramAuthGuard, OptionalUserGuard],
})
export class ContentModule {}


