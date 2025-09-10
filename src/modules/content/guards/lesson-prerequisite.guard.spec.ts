import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ExecutionContext, ForbiddenException, BadRequestException } from '@nestjs/common';
import { LessonPrerequisiteGuard } from './lesson-prerequisite.guard';
import { Lesson, LessonDocument } from '../../common/schemas/lesson.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../../common/schemas/user-lesson-progress.schema';

describe('LessonPrerequisiteGuard', () => {
  let guard: LessonPrerequisiteGuard;
  let lessonModel: any;
  let progressModel: any;
  let mockExecutionContext: ExecutionContext;

  const mockLesson = {
    _id: 'lesson1',
    lessonRef: 'a0.basics.001',
    moduleRef: 'a0.basics',
    order: 1,
    published: true,
  };

  const mockLesson2 = {
    _id: 'lesson2',
    lessonRef: 'a0.basics.002',
    moduleRef: 'a0.basics',
    order: 2,
    published: true,
  };

  const mockProgress = {
    _id: 'progress1',
    userId: 'user123',
    lessonRef: 'a0.basics.001',
    status: 'completed',
  };

  beforeEach(async () => {
    const mockLessonModel = {
      findOne: jest.fn(),
    };

    const mockProgressModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LessonPrerequisiteGuard,
        {
          provide: getModelToken(Lesson.name),
          useValue: mockLessonModel,
        },
        {
          provide: getModelToken(UserLessonProgress.name),
          useValue: mockProgressModel,
        },
      ],
    }).compile();

    guard = module.get<LessonPrerequisiteGuard>(LessonPrerequisiteGuard);
    lessonModel = module.get(getModelToken(Lesson.name));
    progressModel = module.get(getModelToken(UserLessonProgress.name));

    mockExecutionContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.001' },
          query: { userId: 'user123' },
        }),
      }),
    } as ExecutionContext;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw BadRequestException when lessonRef is missing', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: {},
          query: { userId: 'user123' },
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when userId is missing', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.001' },
          query: {},
        }),
      }),
    } as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when lesson is not found', async () => {
    lessonModel.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(BadRequestException);
  });

  it('should allow access to first lesson in module (order = 1)', async () => {
    lessonModel.findOne.mockResolvedValue(mockLesson);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(progressModel.findOne).not.toHaveBeenCalled();
  });

  it('should allow access when previous lesson is completed', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.002' },
          query: { userId: 'user123' },
        }),
      }),
    } as ExecutionContext;

    lessonModel.findOne
      .mockResolvedValueOnce(mockLesson2) // current lesson
      .mockResolvedValueOnce(mockLesson); // previous lesson

    progressModel.findOne.mockResolvedValue(mockProgress);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(lessonModel.findOne).toHaveBeenCalledTimes(2);
    expect(progressModel.findOne).toHaveBeenCalledWith({
      userId: 'user123',
      lessonRef: 'a0.basics.001',
      status: 'completed',
    });
  });

  it('should throw ForbiddenException when previous lesson is not completed', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.002' },
          query: { userId: 'user123' },
        }),
      }),
    } as ExecutionContext;

    lessonModel.findOne
      .mockResolvedValueOnce(mockLesson2) // current lesson
      .mockResolvedValueOnce(mockLesson); // previous lesson

    progressModel.findOne.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access when previous lesson is not found', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.002' },
          query: { userId: 'user123' },
        }),
      }),
    } as ExecutionContext;

    lessonModel.findOne
      .mockResolvedValueOnce(mockLesson2) // current lesson
      .mockResolvedValueOnce(null); // previous lesson not found

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(progressModel.findOne).not.toHaveBeenCalled();
  });

  it('should handle userId from body or params', async () => {
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          params: { lessonRef: 'a0.basics.001', userId: 'user123' },
          query: {},
          body: {},
        }),
      }),
    } as ExecutionContext;

    lessonModel.findOne.mockResolvedValue(mockLesson);

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });
});
