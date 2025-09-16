import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VocabularyService } from './vocabulary.service';
import { 
  GetModuleVocabularyDto, 
  MarkWordLearnedDto, 
  UpdateWordProgressDto, 
  SyncModuleVocabularyDto,
  GetVocabularyProgressDto,
  GetUserWordProgressDto,
  VocabularyResponseDto,
  VocabularyProgressResponseDto,
  UserWordProgressResponseDto,
  SyncVocabularyResponseDto
} from './dto/vocabulary.dto';

@Controller('vocabulary')
@UseGuards(JwtAuthGuard)
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

  /**
   * Get vocabulary for a specific module
   * GET /api/v2/vocabulary/modules/{moduleRef}
   */
  @Get('modules/:moduleRef')
  async getModuleVocabulary(
    @Param('moduleRef') moduleRef: string,
    @Query('lang') lang?: string,
    @Request() req: any
  ): Promise<VocabularyResponseDto> {
    // Basic validation
    if (!/^[a-z0-9]+\.[a-z0-9_]+$/.test(moduleRef)) {
      throw new BadRequestException('Invalid moduleRef format');
    }

    const userId = req.user?.userId;
    const result = await this.vocabularyService.getModuleVocabulary(moduleRef, userId);
    
    return {
      words: result.words,
      progress: result.progress
    };
  }

  /**
   * Get vocabulary progress statistics for a module
   * GET /api/v2/vocabulary/modules/{moduleRef}/progress
   */
  @Get('modules/:moduleRef/progress')
  async getVocabularyProgress(
    @Param('moduleRef') moduleRef: string,
    @Request() req: any
  ): Promise<VocabularyProgressResponseDto> {
    if (!/^[a-z0-9]+\.[a-z0-9_]+$/.test(moduleRef)) {
      throw new BadRequestException('Invalid moduleRef format');
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    return await this.vocabularyService.getVocabularyProgressStats(moduleRef, userId);
  }

  /**
   * Mark a word as learned
   * POST /api/v2/vocabulary/mark-learned
   */
  @Post('mark-learned')
  async markWordAsLearned(
    @Body() body: MarkWordLearnedDto,
    @Request() req: any
  ): Promise<UserWordProgressResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    // Validate that the userId in body matches the JWT token
    if (body.userId !== userId) {
      throw new BadRequestException('userId mismatch');
    }

    return await this.vocabularyService.markWordAsLearned(
      body.userId,
      body.moduleRef,
      body.wordId
    );
  }

  /**
   * Update word learning progress
   * POST /api/v2/vocabulary/update-progress
   */
  @Post('update-progress')
  async updateWordProgress(
    @Body() body: UpdateWordProgressDto,
    @Request() req: any
  ): Promise<UserWordProgressResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    // Validate that the userId in body matches the JWT token
    if (body.userId !== userId) {
      throw new BadRequestException('userId mismatch');
    }

    return await this.vocabularyService.updateWordProgress(
      body.userId,
      body.moduleRef,
      body.wordId,
      body.isCorrect,
      body.timeSpent || 0
    );
  }

  /**
   * Get user's progress for a specific word
   * GET /api/v2/vocabulary/words/{wordId}/progress
   */
  @Get('words/:wordId/progress')
  async getUserWordProgress(
    @Param('wordId') wordId: string,
    @Query('moduleRef') moduleRef: string,
    @Request() req: any
  ): Promise<UserWordProgressResponseDto | null> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

    if (!moduleRef) {
      throw new BadRequestException('moduleRef is required');
    }

    return await this.vocabularyService.getUserWordProgress(userId, moduleRef, wordId);
  }

  /**
   * Sync vocabulary from lessons to database (Admin endpoint)
   * POST /api/v2/vocabulary/sync
   */
  @Post('sync')
  async syncModuleVocabulary(
    @Body() body: SyncModuleVocabularyDto
  ): Promise<SyncVocabularyResponseDto> {
    const result = await this.vocabularyService.syncModuleVocabulary(body.moduleRef);
    
    return {
      created: result.created,
      updated: result.updated,
      message: `Vocabulary synced for module ${body.moduleRef}. Created: ${result.created}, Updated: ${result.updated}`
    };
  }

  /**
   * Extract words from module lessons (Admin endpoint)
   * GET /api/v2/vocabulary/modules/{moduleRef}/extract
   */
  @Get('modules/:moduleRef/extract')
  async extractWordsFromModule(
    @Param('moduleRef') moduleRef: string
  ): Promise<{ words: any[]; count: number }> {
    if (!/^[a-z0-9]+\.[a-z0-9_]+$/.test(moduleRef)) {
      throw new BadRequestException('Invalid moduleRef format');
    }

    const words = await this.vocabularyService.extractWordsFromModule(moduleRef);
    
    return {
      words,
      count: words.length
    };
  }
}
