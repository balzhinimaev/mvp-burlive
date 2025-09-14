import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import * as fs from 'fs';
import * as path from 'path';

import { TaskDto, FlashcardTaskDataDto, MatchingTaskDataDto } from '../src/modules/content/dto/task-data.dto';

describe('A0 Content Validation', () => {
  let seedData: any;

  beforeAll(() => {
    // Load seed data
    const basicsPath = path.resolve('content/seeds/a0-basics.json');
    const travelPath = path.resolve('content/seeds/a0-travel.json');
    
    if (!fs.existsSync(basicsPath)) {
      throw new Error(`Seed file not found: ${basicsPath}`);
    }
    
    if (!fs.existsSync(travelPath)) {
      throw new Error(`Seed file not found: ${travelPath}`);
    }
    
    const basicsData = JSON.parse(fs.readFileSync(basicsPath, 'utf-8'));
    const travelData = JSON.parse(fs.readFileSync(travelPath, 'utf-8'));
    
    seedData = {
      basics: basicsData,
      travel: travelData
    };
  });

  describe('A0 Basics Module Validation', () => {
    it('should validate module structure', () => {
      const module = seedData.basics.module;
      
      expect(module.moduleRef).toBe('a0.basics');
      expect(module.level).toBe('A0');
      expect(module.title.en).toBeDefined();
      expect(module.title.ru).toBeDefined();
      expect(module.published).toBe(true);
      expect(module.requiresPro).toBe(false);
    });

    it('should have 6 lessons', () => {
      expect(seedData.basics.lessons).toHaveLength(6);
    });

    it('should validate all lesson structures', () => {
      seedData.basics.lessons.forEach((lesson: any, index: number) => {
        expect(lesson.moduleRef).toBe('a0.basics');
        expect(lesson.lessonRef).toMatch(/^a0\.basics\.\d{3}$/);
        expect(lesson.order).toBe(index + 1);
        expect(lesson.estimatedMinutes).toBeGreaterThan(0);
        expect(lesson.estimatedMinutes).toBeLessThan(25);
        expect(lesson.type).toMatch(/^(conversation|vocabulary|grammar)$/);
        expect(lesson.difficulty).toBe('easy');
        expect(lesson.xpReward).toBeGreaterThanOrEqual(25);
        expect(lesson.hasAudio).toBe(true);
        expect(lesson.tasks).toBeDefined();
        expect(lesson.tasks.length).toBeGreaterThanOrEqual(6);
        expect(lesson.tasks.length).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('A0 Travel Module Validation', () => {
    it('should validate module structure', () => {
      const module = seedData.travel.module;
      
      expect(module.moduleRef).toBe('a0.travel');
      expect(module.level).toBe('A0');
      expect(module.order).toBe(2);
      expect(module.published).toBe(true);
      expect(module.requiresPro).toBe(false);
    });

    it('should have 6 lessons', () => {
      expect(seedData.travel.lessons).toHaveLength(6);
    });
  });

  describe('Task DTO Validation', () => {
    let allTasks: any[];

    beforeAll(() => {
      allTasks = [
        ...seedData.basics.lessons.flatMap((l: any) => l.tasks),
        ...seedData.travel.lessons.flatMap((l: any) => l.tasks)
      ];
    });

    it('should validate all task refs follow correct pattern', () => {
      allTasks.forEach(task => {
        expect(task.ref).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+$/);
      });
    });

    it('should validate task types are supported', () => {
      const supportedTypes = ['flashcard', 'multiple_choice', 'listening', 'matching'];
      
      allTasks.forEach(task => {
        expect(supportedTypes).toContain(task.type);
      });
    });

    it('should validate flashcard tasks using DTO', async () => {
      const flashcardTasks = allTasks.filter(task => task.type === 'flashcard');
      
      expect(flashcardTasks.length).toBeGreaterThan(0);
      
      for (const task of flashcardTasks) {
        const taskDto = plainToClass(TaskDto, task);
        const errors = await validate(taskDto);
        
        if (errors.length > 0) {
          console.error(`Validation failed for flashcard task ${task.ref}:`, errors);
        }
        
        expect(errors).toHaveLength(0);
        
        // Validate flashcard-specific data
        expect(task.data.front).toBeDefined();
        expect(task.data.back).toBeDefined();
        expect(typeof task.data.front).toBe('string');
        expect(typeof task.data.back).toBe('string');
        expect(task.data.front.length).toBeGreaterThan(0);
        expect(task.data.back.length).toBeGreaterThan(0);
        
        if (task.data.audioKey) {
          expect(task.data.audioKey).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+\./);
        }
      }
    });

    it('should validate multiple_choice tasks', async () => {
      const multipleChoiceTasks = allTasks.filter(task => task.type === 'multiple_choice');
      
      expect(multipleChoiceTasks.length).toBeGreaterThan(0);
      
      for (const task of multipleChoiceTasks) {
        const taskDto = plainToClass(TaskDto, task);
        const errors = await validate(taskDto);
        
        expect(errors).toHaveLength(0);
        
        // Validate multiple choice specific data
        expect(task.data.question).toBeDefined();
        expect(task.data.options).toBeDefined();
        expect(Array.isArray(task.data.options)).toBe(true);
        expect(task.data.options.length).toBeGreaterThanOrEqual(3);
        expect(task.data.options.length).toBeLessThanOrEqual(4);
        expect(task.data.correctIndex).toBeDefined();
        expect(task.data.correctIndex).toBeGreaterThanOrEqual(0);
        expect(task.data.correctIndex).toBeLessThan(task.data.options.length);
        expect(task.data.explanation).toBeDefined();
      }
    });

    it('should validate listening tasks', async () => {
      const listeningTasks = allTasks.filter(task => task.type === 'listening');
      
      expect(listeningTasks.length).toBeGreaterThan(0);
      
      for (const task of listeningTasks) {
        const taskDto = plainToClass(TaskDto, task);
        const errors = await validate(taskDto);
        
        expect(errors).toHaveLength(0);
        
        // Validate listening specific data
        expect(task.data.audioKey).toBeDefined();
        expect(task.data.question).toBeDefined();
        expect(task.data.transcript).toBeDefined();
        expect(task.data.translation).toBeDefined();
        expect(task.data.audioKey).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+\./);
      }
    });

    it('should validate matching tasks using DTO', async () => {
      const matchingTasks = allTasks.filter(task => task.type === 'matching');
      
      expect(matchingTasks.length).toBeGreaterThan(0);
      
      for (const task of matchingTasks) {
        const taskDto = plainToClass(TaskDto, task);
        const errors = await validate(taskDto);
        
        expect(errors).toHaveLength(0);
        
        // Validate matching specific data
        expect(task.data.pairs).toBeDefined();
        expect(Array.isArray(task.data.pairs)).toBe(true);
        expect(task.data.pairs.length).toBeGreaterThanOrEqual(3);
        expect(task.data.pairs.length).toBeLessThanOrEqual(6);
        
        task.data.pairs.forEach((pair: any, index: number) => {
          expect(pair.left).toBeDefined();
          expect(pair.right).toBeDefined();
          expect(typeof pair.left).toBe('string');
          expect(typeof pair.right).toBe('string');
          
          if (pair.audioKey) {
            expect(pair.audioKey).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+\./);
          }
        });
      }
    });
  });

  describe('Content Quality Validation', () => {
    it('should have spaced repetition (word repetition across lessons)', () => {
      const basicsLessons = seedData.basics.lessons;
      
      // Check that "Hello" appears in multiple lessons
      let helloCount = 0;
      basicsLessons.forEach((lesson: any) => {
        lesson.tasks.forEach((task: any) => {
          if (task.type === 'flashcard' && 
              (task.data.front === 'Hello' || task.data.back === 'Привет')) {
            helloCount++;
          }
        });
      });
      
      expect(helloCount).toBeGreaterThanOrEqual(2);
    });

    it('should have Russian explanations in multiple_choice tasks', () => {
      const multipleChoiceTasks = [
        ...seedData.basics.lessons.flatMap((l: any) => l.tasks),
        ...seedData.travel.lessons.flatMap((l: any) => l.tasks)
      ].filter(task => task.type === 'multiple_choice');
      
      multipleChoiceTasks.forEach(task => {
        expect(task.data.explanation).toBeDefined();
        // Check that explanation contains Cyrillic characters (Russian)
        expect(task.data.explanation).toMatch(/[а-яё]/i);
      });
    });

    it('should have appropriate estimated minutes for A0 level', () => {
      const allLessons = [...seedData.basics.lessons, ...seedData.travel.lessons];
      
      allLessons.forEach((lesson: any) => {
        expect(lesson.estimatedMinutes).toBeGreaterThanOrEqual(5);
        expect(lesson.estimatedMinutes).toBeLessThanOrEqual(20);
      });
    });

    it('should have consistent audioKey patterns', () => {
      const allTasks = [
        ...seedData.basics.lessons.flatMap((l: any) => l.tasks),
        ...seedData.travel.lessons.flatMap((l: any) => l.tasks)
      ];
      
      allTasks.forEach(task => {
        if (task.data.audioKey) {
          expect(task.data.audioKey).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+\.\w+$/);
        }
        
        if (task.data.pairs) {
          task.data.pairs.forEach((pair: any) => {
            if (pair.audioKey) {
              expect(pair.audioKey).toMatch(/^a0\.(basics|travel)\.\d{3}\.t\d+\.\w+$/);
            }
          });
        }
      });
    });
  });
});
