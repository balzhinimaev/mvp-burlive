import 'dotenv/config';
import mongoose from 'mongoose';
import { CourseModule, CourseModuleSchema } from '../src/modules/common/schemas/course-module.schema';
import { Lesson, LessonSchema } from '../src/modules/common/schemas/lesson.schema';

async function main() {
  const uri = process.env.MONGODB_URI || '';
  const dbName = process.env.MONGODB_DB_NAME || 'burlang-db';
  if (!uri) throw new Error('MONGODB_URI is required');

  await mongoose.connect(uri, { dbName });
  const ModuleModel = mongoose.model('CourseModule', CourseModuleSchema, 'course_modules');
  const LessonModel = mongoose.model('Lesson', LessonSchema, 'lessons');

  const modules = await ModuleModel.find({}).exec();
  for (const m of modules as any[]) {
    if (!m.moduleRef) m.moduleRef = m.ref || `${(m.level||'a0').toLowerCase()}.module-${m._id.toString().slice(-4)}`;
    if (!m.level) m.level = m.levelMin || 'A0';
    if (typeof m.published !== 'boolean') m.published = m.status === 'published';
    if (typeof m.order !== 'number') m.order = m.order ?? 0;
    await m.save();
  }

  const lessons = await LessonModel.find({}).exec();
  for (const l of lessons as any[]) {
    if (!l.lessonRef) l.lessonRef = l.ref || `${l.moduleRef || 'a0.unknown'}.001`;
    if (!l.moduleRef) {
      const parts = String(l.lessonRef).split('.');
      l.moduleRef = parts.slice(0,2).join('.');
    }
    if (typeof l.published !== 'boolean') l.published = l.status === 'published';
    if (!l.estimatedMinutes) l.estimatedMinutes = Math.max(1, Math.ceil((l.estimatedSec ?? 600)/60));
    await l.save();
  }

  await ModuleModel.collection.createIndex({ moduleRef: 1 }, { unique: true, sparse: true });
  await LessonModel.collection.createIndex({ lessonRef: 1 }, { unique: true, sparse: true });

  await mongoose.disconnect();
  // eslint-disable-next-line no-console
  console.log('Migration completed');
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


