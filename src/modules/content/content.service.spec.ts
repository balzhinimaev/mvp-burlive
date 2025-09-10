import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ContentService } from './content.service';
import { CourseModule, CourseModuleDocument } from '../common/schemas/course-module.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';
import { UserLessonProgress, UserLessonProgressDocument } from '../common/schemas/user-lesson-progress.schema';

describe('ContentService', () => {
  let service: ContentService;
  let moduleModel: any;
  let lessonModel: any;
  let progressModel: any;

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
    const mockModuleModel = {
      create: jest.fn(),
      find: jest.fn(),
      updateOne: jest.fn(),
    };

    const mockLessonModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };

    const mockProgressModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: getModelToken(CourseModule.name),
          useValue: mockModuleModel,
        },
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

    service = module.get<ContentService>(ContentService);
    moduleModel = module.get(getModelToken(CourseModule.name));
    lessonModel = module.get(getModelToken(Lesson.name));
    progressModel = module.get(getModelToken(UserLessonProgress.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canStartLesson', () => {
    it('should return canStart: false when lesson is not found', async () => {
      lessonModel.findOne.mockResolvedValue(null);

      const result = await service.canStartLesson('user123', 'nonexistent.lesson');

      expect(result).toEqual({
        canStart: false,
        reason: 'Lesson not found',
      });
    });

    it('should return canStart: true for first lesson in module (order = 1)', async () => {
      lessonModel.findOne.mockResolvedValue(mockLesson);

      const result = await service.canStartLesson('user123', 'a0.basics.001');

      expect(result).toEqual({
        canStart: true,
      });
      expect(progressModel.findOne).not.toHaveBeenCalled();
    });

    it('should return canStart: true when previous lesson is completed', async () => {
      lessonModel.findOne
        .mockResolvedValueOnce(mockLesson2) // current lesson
        .mockResolvedValueOnce(mockLesson); // previous lesson

      progressModel.findOne.mockResolvedValue(mockProgress);

      const result = await service.canStartLesson('user123', 'a0.basics.002');

      expect(result).toEqual({
        canStart: true,
      });
      expect(lessonModel.findOne).toHaveBeenCalledTimes(2);
      expect(progressModel.findOne).toHaveBeenCalledWith({
        userId: 'user123',
        lessonRef: 'a0.basics.001',
        status: 'completed',
      });
    });

    it('should return canStart: false when previous lesson is not completed', async () => {
      lessonModel.findOne
        .mockResolvedValueOnce(mockLesson2) // current lesson
        .mockResolvedValueOnce(mockLesson); // previous lesson

      progressModel.findOne.mockResolvedValue(null);

      const result = await service.canStartLesson('user123', 'a0.basics.002');

      expect(result).toEqual({
        canStart: false,
        reason: 'Previous lesson a0.basics.001 must be completed before starting a0.basics.002',
        requiredLesson: 'a0.basics.001',
      });
    });

    it('should return canStart: true when previous lesson is not found', async () => {
      lessonModel.findOne
        .mockResolvedValueOnce(mockLesson2) // current lesson
        .mockResolvedValueOnce(null); // previous lesson not found

      const result = await service.canStartLesson('user123', 'a0.basics.002');

      expect(result).toEqual({
        canStart: true,
      });
      expect(progressModel.findOne).not.toHaveBeenCalled();
    });

    it('should handle lessons with different modules', async () => {
      const lessonFromDifferentModule = {
        _id: 'lesson3',
        lessonRef: 'a1.advanced.001',
        moduleRef: 'a1.advanced',
        order: 1,
        published: true,
      };

      lessonModel.findOne.mockResolvedValue(lessonFromDifferentModule);

      const result = await service.canStartLesson('user123', 'a1.advanced.001');

      expect(result).toEqual({
        canStart: true,
      });
    });

    it('should handle lessons with order > 1 but no previous lesson', async () => {
      const lessonWithoutPrevious = {
        _id: 'lesson4',
        lessonRef: 'a0.basics.003',
        moduleRef: 'a0.basics',
        order: 3,
        published: true,
      };

      lessonModel.findOne
        .mockResolvedValueOnce(lessonWithoutPrevious) // current lesson
        .mockResolvedValueOnce(null); // previous lesson not found

      const result = await service.canStartLesson('user123', 'a0.basics.003');

      expect(result).toEqual({
        canStart: true,
      });
    });
  });
});
