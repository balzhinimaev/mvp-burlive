import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

describe('A0 Content API (e2e)', () => {
  let app: INestApplication;
  const testUserId = 'test-user-a0-content';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Content Modules', () => {
    it('GET /content/modules should include A0 modules', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/modules')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      // Check for A0 modules
      const a0Modules = response.body.filter((module: any) => module.level === 'A0');
      expect(a0Modules.length).toBeGreaterThanOrEqual(2);

      // Check for basics module
      const basicsModule = a0Modules.find((module: any) => module.moduleRef === 'a0.basics');
      expect(basicsModule).toBeDefined();
      expect(basicsModule.title).toBeDefined();
      expect(basicsModule.order).toBe(1);
      expect(basicsModule.requiresPro).toBe(false);

      // Check for travel module  
      const travelModule = a0Modules.find((module: any) => module.moduleRef === 'a0.travel');
      expect(travelModule).toBeDefined();
      expect(travelModule.title).toBeDefined();
      expect(travelModule.order).toBe(2);
      expect(travelModule.requiresPro).toBe(false);
    });
  });

  describe('Content Lessons', () => {
    it('GET /content/modules/:moduleRef/lessons should return A0 basics lessons', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/modules/a0.basics/lessons')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(6);

      // Check first lesson structure
      const firstLesson = response.body[0];
      expect(firstLesson.lessonRef).toBe('a0.basics.001');
      expect(firstLesson.moduleRef).toBe('a0.basics');
      expect(firstLesson.order).toBe(1);
      expect(firstLesson.estimatedMinutes).toBeGreaterThan(0);
      expect(firstLesson.hasAudio).toBe(true);
      expect(firstLesson.difficulty).toBe('easy');
    });

    it('GET /content/modules/:moduleRef/lessons should return A0 travel lessons', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/modules/a0.travel/lessons')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(6);

      // Check lesson order
      response.body.forEach((lesson: any, index: number) => {
        expect(lesson.order).toBe(index + 1);
        expect(lesson.moduleRef).toBe('a0.travel');
      });
    });
  });

  describe('Lesson Details and Tasks', () => {
    it('GET /content/lessons/:lessonRef should return lesson with tasks', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.lessonRef).toBe('a0.basics.001');
      expect(response.body.tasks).toBeDefined();
      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks.length).toBeGreaterThanOrEqual(6);

      // Check task structure
      const firstTask = response.body.tasks[0];
      expect(firstTask.ref).toBeDefined();
      expect(firstTask.type).toBeDefined();
      expect(firstTask.data).toBeDefined();
      expect(['flashcard', 'multiple_choice', 'listening', 'matching']).toContain(firstTask.type);
    });

    it('should have valid flashcard tasks in A0 lessons', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001')
        .query({ userId: testUserId })
        .expect(200);

      const flashcardTasks = response.body.tasks.filter((task: any) => task.type === 'flashcard');
      expect(flashcardTasks.length).toBeGreaterThan(0);

      flashcardTasks.forEach((task: any) => {
        expect(task.data.front).toBeDefined();
        expect(task.data.back).toBeDefined();
        expect(typeof task.data.front).toBe('string');
        expect(typeof task.data.back).toBe('string');
        if (task.data.audioKey) {
          expect(task.data.audioKey).toMatch(/^a0\.basics\.\d{3}\.t\d+\./);
        }
      });
    });

    it('should have valid multiple_choice tasks with Russian explanations', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001')
        .query({ userId: testUserId })
        .expect(200);

      const multipleChoiceTasks = response.body.tasks.filter((task: any) => task.type === 'multiple_choice');
      expect(multipleChoiceTasks.length).toBeGreaterThan(0);

      multipleChoiceTasks.forEach((task: any) => {
        expect(task.data.question).toBeDefined();
        expect(task.data.options).toBeDefined();
        expect(Array.isArray(task.data.options)).toBe(true);
        expect(task.data.options.length).toBeGreaterThanOrEqual(3);
        expect(task.data.correctIndex).toBeDefined();
        expect(task.data.explanation).toBeDefined();
        // Check for Russian characters in explanation
        expect(task.data.explanation).toMatch(/[а-яё]/i);
      });
    });
  });

  describe('Lesson Prerequisites (Gating)', () => {
    it('should allow access to first lesson in module', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001/can-start')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.canStart).toBe(true);
    });

    it('should prevent access to second lesson without completing first', async () => {
      // Try to access second lesson without completing first
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002/can-start')
        .query({ userId: testUserId });

      // Should either return 403 or canStart: false
      if (response.status === 200) {
        expect(response.body.canStart).toBe(false);
        expect(response.body.requiredLesson).toBe('a0.basics.001');
      } else {
        expect(response.status).toBe(403);
        expect(response.body.error).toBe('PREREQ_NOT_MET');
      }
    });
  });

  describe('Task Attempt Submission', () => {
    it('should accept valid task attempt', async () => {
      const taskRef = 'a0.basics.001.t1';
      
      const response = await request(app.getHttpServer())
        .post(`/progress/tasks/${taskRef}/attempt`)
        .send({
          userId: testUserId,
          lessonRef: 'a0.basics.001',
          taskRef: taskRef,
          userAnswer: 'Hello',
          durationMs: 5000,
          lastTaskIndex: 0,
          isLastTask: false
        })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.correct).toBeDefined();
      expect(response.body.score).toBeDefined();
    });

    it('should complete lesson when last task is submitted', async () => {
      // Get lesson to find last task
      const lessonResponse = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.001')
        .query({ userId: testUserId })
        .expect(200);

      const lastTask = lessonResponse.body.tasks[lessonResponse.body.tasks.length - 1];
      
      const response = await request(app.getHttpServer())
        .post(`/progress/tasks/${lastTask.ref}/attempt`)
        .send({
          userId: testUserId,
          lessonRef: 'a0.basics.001',
          taskRef: lastTask.ref,
          userAnswer: 'test-answer',
          durationMs: 3000,
          lastTaskIndex: lessonResponse.body.tasks.length - 1,
          isLastTask: true
        })
        .expect(201);

      expect(response.body).toBeDefined();
      
      // Check that lesson progress was updated
      const progressResponse = await request(app.getHttpServer())
        .get('/progress/lessons/a0.basics.001')
        .query({ userId: testUserId })
        .expect(200);

      expect(progressResponse.body.status).toBe('completed');
    });

    it('should allow access to second lesson after completing first', async () => {
      const response = await request(app.getHttpServer())
        .get('/content/lessons/a0.basics.002/can-start')
        .query({ userId: testUserId })
        .expect(200);

      expect(response.body.canStart).toBe(true);
    });
  });

  describe('XP and Progress Tracking', () => {
    it('should award XP for correct task answers', async () => {
      const taskRef = 'a0.basics.002.t1';
      
      // Get user XP before
      const userBefore = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .expect(200);

      const xpBefore = userBefore.body.xpTotal || 0;

      // Submit correct answer
      await request(app.getHttpServer())
        .post(`/progress/tasks/${taskRef}/attempt`)
        .send({
          userId: testUserId,
          lessonRef: 'a0.basics.002',
          taskRef: taskRef,
          userAnswer: 'correct-answer',
          durationMs: 2000,
          lastTaskIndex: 0,
          isLastTask: false
        })
        .expect(201);

      // Get user XP after
      const userAfter = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .expect(200);

      const xpAfter = userAfter.body.xpTotal || 0;
      
      expect(xpAfter).toBeGreaterThan(xpBefore);
    });
  });
});
