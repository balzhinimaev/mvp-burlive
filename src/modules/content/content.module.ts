import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContentController } from './content.controller';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../common/schemas/user.schema';
import { CourseModule, CourseModuleSchema } from '../common/schemas/course-module.schema';
import { Lesson, LessonSchema } from '../common/schemas/lesson.schema';
import { ContentService } from './content.service';
import { AdminContentController } from './admin-content.controller';

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
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
})
export class ContentModule {}


