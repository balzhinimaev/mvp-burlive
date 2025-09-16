import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VocabularyItem, VocabularyDocument } from '../common/schemas/vocabulary.schema';
import { UserVocabularyProgress, UserVocabularyProgressDocument } from '../common/schemas/user-vocabulary-progress.schema';
import { Lesson, LessonDocument } from '../common/schemas/lesson.schema';
import { VocabularyItem as VocabularyItemType, UserVocabularyProgress as UserVocabularyProgressType, VocabularyProgressStats } from '../common/types/content';
import { VocabularyMapper, UserVocabularyProgressMapper } from '../common/utils/mappers';

@Injectable()
export class VocabularyService {
  constructor(
    @InjectModel(VocabularyItem.name) private readonly vocabularyModel: Model<VocabularyDocument>,
    @InjectModel(UserVocabularyProgress.name) private readonly progressModel: Model<UserVocabularyProgressDocument>,
    @InjectModel(Lesson.name) private readonly lessonModel: Model<LessonDocument>,
  ) {}

  /**
   * Extract vocabulary words from lessons in a module
   */
  async extractWordsFromModule(moduleRef: string): Promise<VocabularyItemType[]> {
    // Get all lessons in the module
    const lessons = await this.lessonModel
      .find({ moduleRef, published: true })
      .lean();

    const wordMap = new Map<string, VocabularyItemType>();

    for (const lesson of lessons) {
      if (!lesson.tasks) continue;

      for (const task of lesson.tasks) {
        // Extract words from flashcard tasks
        if (task.type === 'flashcard' && task.data) {
          const { front, back, example, audioKey } = task.data;
          
          if (front && back) {
            const wordId = this.generateWordId(front, moduleRef);
            
            if (!wordMap.has(wordId)) {
              wordMap.set(wordId, {
                id: wordId,
                word: front,
                translation: back,
                examples: example ? [{ original: example, translation: '' }] : [],
                audioKey: audioKey || this.generateAudioKey(lesson.lessonRef, task.ref, front),
                difficulty: this.determineDifficulty(front),
                tags: this.extractTagsFromLesson(lesson),
                lessonRefs: [],
                moduleRefs: [moduleRef],
                occurrenceCount: 0,
                isLearned: false
              });
            }

            const word = wordMap.get(wordId)!;
            word.lessonRefs!.push(lesson.lessonRef);
            word.occurrenceCount!++;
          }
        }

        // Extract words from matching tasks
        if (task.type === 'matching' && task.data?.pairs) {
          for (const pair of task.data.pairs) {
            if (pair.left && pair.right) {
              const wordId = this.generateWordId(pair.left, moduleRef);
              
              if (!wordMap.has(wordId)) {
                wordMap.set(wordId, {
                  id: wordId,
                  word: pair.left,
                  translation: pair.right,
                  examples: [],
                  audioKey: pair.audioKey || this.generateAudioKey(lesson.lessonRef, task.ref, pair.left),
                  difficulty: this.determineDifficulty(pair.left),
                  tags: this.extractTagsFromLesson(lesson),
                  lessonRefs: [],
                  moduleRefs: [moduleRef],
                  occurrenceCount: 0,
                  isLearned: false
                });
              }

              const word = wordMap.get(wordId)!;
              word.lessonRefs!.push(lesson.lessonRef);
              word.occurrenceCount!++;
            }
          }
        }
      }
    }

    return Array.from(wordMap.values());
  }

  /**
   * Get vocabulary for a specific module with user progress
   */
  async getModuleVocabulary(moduleRef: string, userId?: string): Promise<{
    words: VocabularyItemType[];
    progress?: VocabularyProgressStats;
  }> {
    // Get all vocabulary items for the module
    const vocabularyItems = await this.vocabularyModel
      .find({ moduleRefs: moduleRef })
      .sort({ word: 1 })
      .lean();

    const words = vocabularyItems.map(item => VocabularyMapper.toDto(item));

    if (!userId) {
      return { words };
    }

    // Get user progress for this module
    const progress = await this.getVocabularyProgressStats(moduleRef, userId);

    return { words, progress };
  }

  /**
   * Get vocabulary progress statistics for a user in a module
   */
  async getVocabularyProgressStats(moduleRef: string, userId: string): Promise<VocabularyProgressStats> {
    // Get all vocabulary items for the module
    const totalWords = await this.vocabularyModel.countDocuments({ moduleRefs: moduleRef });

    // Get user progress
    const progressData = await this.progressModel.aggregate([
      { $match: { userId, moduleRef } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const stats = {
      learned: 0,
      learning: 0,
      notStarted: 0
    };

    for (const item of progressData) {
      switch (item._id) {
        case 'learned':
          stats.learned = item.count;
          break;
        case 'learning':
          stats.learning = item.count;
          break;
        case 'not_started':
          stats.notStarted = item.count;
          break;
      }
    }

    const learnedWords = stats.learned;
    const learningWords = stats.learning;
    const notStartedWords = totalWords - learnedWords - learningWords;
    const progressPercentage = totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0;

    return {
      totalWords,
      learnedWords,
      learningWords,
      notStartedWords,
      progressPercentage
    };
  }

  /**
   * Mark a word as learned for a user
   */
  async markWordAsLearned(userId: string, moduleRef: string, wordId: string): Promise<UserVocabularyProgressType> {
    const progress = await this.progressModel.findOneAndUpdate(
      { userId, moduleRef, wordId },
      {
        $set: {
          status: 'learned',
          learnedAt: new Date(),
          lastStudiedAt: new Date()
        },
        $inc: { attempts: 1 }
      },
      { new: true, upsert: true }
    );

    return UserVocabularyProgressMapper.toDto(progress);
  }

  /**
   * Update word learning progress
   */
  async updateWordProgress(
    userId: string, 
    moduleRef: string, 
    wordId: string, 
    isCorrect: boolean, 
    timeSpent: number = 0
  ): Promise<UserVocabularyProgressType> {
    const updateData: any = {
      $set: {
        lastStudiedAt: new Date(),
        status: isCorrect ? 'learning' : 'not_started'
      },
      $inc: {
        attempts: 1,
        timeSpent,
        totalAttempts: 1,
        correctAttempts: isCorrect ? 1 : 0
      }
    };

    if (isCorrect) {
      updateData.$set.score = 0.8; // Set learning progress
    }

    const progress = await this.progressModel.findOneAndUpdate(
      { userId, moduleRef, wordId },
      updateData,
      { new: true, upsert: true }
    );

    return UserVocabularyProgressMapper.toDto(progress);
  }

  /**
   * Sync vocabulary from lessons to database
   */
  async syncModuleVocabulary(moduleRef: string): Promise<{ created: number; updated: number }> {
    const words = await this.extractWordsFromModule(moduleRef);
    let created = 0;
    let updated = 0;

    for (const word of words) {
      const existing = await this.vocabularyModel.findOne({ id: word.id });
      
      if (existing) {
        // Update existing word with new module reference
        await this.vocabularyModel.updateOne(
          { id: word.id },
          {
            $addToSet: { moduleRefs: moduleRef },
            $addToSet: { lessonRefs: { $each: word.lessonRefs || [] } },
            $inc: { occurrenceCount: word.occurrenceCount || 0 }
          }
        );
        updated++;
      } else {
        // Create new word
        await this.vocabularyModel.create(word);
        created++;
      }
    }

    return { created, updated };
  }

  /**
   * Get user's vocabulary progress for a specific word
   */
  async getUserWordProgress(userId: string, moduleRef: string, wordId: string): Promise<UserVocabularyProgressType | null> {
    const progress = await this.progressModel.findOne({ userId, moduleRef, wordId }).lean();
    return progress ? UserVocabularyProgressMapper.toDto(progress) : null;
  }

  // Helper methods
  private generateWordId(word: string, moduleRef?: string): string {
    const sanitize = (value: string): string =>
      value
        .normalize('NFKD')
        .replace(/[^\w\s-]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const buildPart = (value: string): string => {
      const sanitized = sanitize(value);
      return sanitized || Buffer.from(value).toString('hex').toLowerCase();
    };

    const parts: string[] = [];
    if (moduleRef) {
      parts.push(buildPart(moduleRef));
    }
    parts.push(buildPart(word));

    return parts.join('__');
  }

  private generateAudioKey(lessonRef: string, taskRef: string, word: string): string {
    return `${lessonRef}.${taskRef}.${word.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  }

  private determineDifficulty(word: string): 'easy' | 'medium' | 'hard' {
    const length = word.length;
    const hasSpecialChars = /[^a-zA-Z\s]/.test(word);
    
    if (length <= 4 && !hasSpecialChars) return 'easy';
    if (length <= 8 && !hasSpecialChars) return 'medium';
    return 'hard';
  }

  private extractTagsFromLesson(lesson: any): string[] {
    const tags = lesson.tags || [];
    if (lesson.type) tags.push(lesson.type);
    return [...new Set(tags)]; // Remove duplicates
  }
}
