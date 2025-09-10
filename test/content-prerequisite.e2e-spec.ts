import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { User, UserSchema } from '../src/modules/common/schemas/user.schema';
import { CourseModule, CourseModuleSchema } from '../src/modules/common/schemas/course-module.schema';
import { Lesson, LessonSchema } from '../src/modules/common/schemas/lesson.schema';
import { UserLessonProgress, UserLessonProgressSchema } from '../src/modules/common/schemas/user-lesson-progress.schema';

describe('Content Prerequisite (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let userId: string;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const mongoUri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([
          { name: User.name, schema: UserSchema },
          { name: CourseModule.name, schema: CourseModuleSchema },
          { name: Lesson.name, schema: LessonSchema },
          { name: UserLessonProgress.name, schema: UserLessonProgressSchema },
        ]),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user
    userId = 'test-user-123';
    await request(app.getHttpServer())
      .post('/auth/verify')
      .query({
        user: JSON.stringify({
          id: userId,
          first_name: 'Test',
          last_name: 'User',
        }),
        hash: 'test-hash',
      });
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    // Clean up test data
    const db = app.get('DatabaseConnection');
    await db.collection('users').deleteMany({});
    await db.collection('course_modules').deleteMany({});
    await db.collection('lessons').deleteMany({});
    await db.collection('user_lesson_progress').deleteMany({});

    // Create test user
    await db.collection('users').insertOne({
      userId,
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test module
    await db.collection('course_modules').insertOne({
      moduleRef: 'a0.basics',
      level: 'A0',
      title: { ru: 'Основы', en: 'Basics' },
      published: true,
      order: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create test lessons
    await db.collection('lessons').insertMany([
      {
        moduleRef: 'a0.basics',
        lessonRef: 'a0.basics.001',
        title: { ru: 'Урок 1', en: 'Lesson 1' },
        published: true,
        order: 1,
        tasks: [
          {
            ref: 'a0.basics.001.t1',
            type: 'choice',
            data: {
              question: 'What is hello?',
              options: ['Привет', 'Пока', 'Спасибо'],
              correctIndex: 0,
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        moduleRef: 'a0.basics',
        lessonRef: 'a0.basics.002',
        title: { ru: 'Урок 2', en: 'Lesson 2' },
        published: true,
        order: 2,
        tasks: [
          {
            ref: 'a0.basics.002.t1',
            type: 'choice',
            data: {
              question: 'What is goodbye?',
              options: ['Привет', 'Пока', 'Спасибо'],
              correctIndex: 1,
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  describe('GET /content/lessons/:lessonRef', () => {
    it('should allow access to first lesson', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.lesson).toBeDefined();
      expect(response.body.lesson.lessonRef).toBe('a0.basics.001');
    });

    it('should block access to second lesson when first is not completed', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002')
        .query({ userId });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PREREQ_NOT_MET');
      expect(response.body.message).toContain('Previous lesson a0.basics.001 must be completed');
      expect(response.body.requiredLesson).toBe('a0.basics.001');
      expect(response.body.currentLesson).toBe('a0.basics.002');
    });

    it('should allow access to second lesson when first is completed', async () => {
      // Mark first lesson as completed
      const db = app.get('DatabaseConnection');
      await db.collection('user_lesson_progress').insertOne({
        userId,
        lessonRef: 'a0.basics.001',
        moduleRef: 'a0.basics',
        status: 'completed',
        score: 1.0,
        attempts: 1,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.lesson).toBeDefined();
      expect(response.body.lesson.lessonRef).toBe('a0.basics.002');
    });
  });

  describe('GET /content/lessons/:lessonRef/check-prerequisite', () => {
    it('should return canStart: true for first lesson', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001/check-prerequisite')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.canStart).toBe(true);
      expect(response.body.lessonRef).toBe('a0.basics.001');
    });

    it('should return canStart: false for second lesson when first is not completed', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002/check-prerequisite')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.canStart).toBe(false);
      expect(response.body.reason).toContain('Previous lesson a0.basics.001 must be completed');
      expect(response.body.requiredLesson).toBe('a0.basics.001');
      expect(response.body.lessonRef).toBe('a0.basics.002');
    });

    it('should return canStart: true for second lesson when first is completed', async () => {
      // Mark first lesson as completed
      const db = app.get('DatabaseConnection');
      await db.collection('user_lesson_progress').insertOne({
        userId,
        lessonRef: 'a0.basics.001',
        moduleRef: 'a0.basics',
        status: 'completed',
        score: 1.0,
        attempts: 1,
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002/check-prerequisite')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.canStart).toBe(true);
      expect(response.body.lessonRef).toBe('a0.basics.002');
    });

    it('should return error when userId is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001/check-prerequisite');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('userId is required');
    });

    it('should return error when lesson is not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/nonexistent.lesson/check-prerequisite')
        .query({ userId });

      expect(response.status).toBe(200);
      expect(response.body.canStart).toBe(false);
      expect(response.body.reason).toBe('Lesson not found');
    });
  });

  describe('Edge cases', () => {
    it('should handle lessons with in_progress status correctly', async () => {
      // Mark first lesson as in_progress (not completed)
      const db = app.get('DatabaseConnection');
      await db.collection('user_lesson_progress').insertOne({
        userId,
        lessonRef: 'a0.basics.001',
        moduleRef: 'a0.basics',
        status: 'in_progress',
        score: 0.5,
        attempts: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002')
        .query({ userId });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PREREQ_NOT_MET');
    });

    it('should handle lessons with not_started status correctly', async () => {
      // Mark first lesson as not_started
      const db = app.get('DatabaseConnection');
      await db.collection('user_lesson_progress').insertOne({
        userId,
        lessonRef: 'a0.basics.001',
        moduleRef: 'a0.basics',
        status: 'not_started',
        score: 0,
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002')
        .query({ userId });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PREREQ_NOT_MET');
    });
  });
});
