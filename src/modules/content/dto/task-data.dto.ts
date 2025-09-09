import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

// Единый источник правды для типов задач
export const TASK_TYPES = [
  'choice',
  'gap',
  'listen',
  'speak',
  'order',
  'translate',
  'match',
  'multiple_choice',
  'flashcard',
  'listening',
  'matching',
] as const;
export type TaskType = typeof TASK_TYPES[number];

// --- DTO для каждого типа задач ---

export class ChoiceTaskDataDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsArray()
  @IsString({ each: true })
  options!: string[];
}

export class GapTaskDataDto {
  @IsString()
  @IsNotEmpty()
  text!: string; // e.g., "It costs ____ dollars"

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hints?: string[];
}

export class ListenTaskDataDto {
  @IsString()
  @IsNotEmpty()
  audioUrl!: string;

  @IsString()
  @IsOptional()
  transcript?: string; // Может быть на клиенте для self-check
}

export class SpeakTaskDataDto {
  @IsString()
  @IsNotEmpty()
  prompt!: string; // e.g., "Say: 'Hello'"
}

export class OrderTaskDataDto {
  @IsArray()
  @IsString({ each: true })
  tokens!: string[]; // e.g., ["What", "time", "is", "it", "?"]
}

export class TranslateTaskDataDto {
  @IsString()
  @IsNotEmpty()
  question!: string; // e.g., "Переведи: 'сколько это стоит?'"
}

// --- Базовый Task DTO ---
export class TaskDto {
  @IsString()
  ref!: string; // a0.travel.001.t1

  @IsIn(TASK_TYPES)
  type!: TaskType;

  @IsObject()
  @ValidateNested()
  @Type(({ object }: any) => {
    switch (object.type as TaskType) {
      case 'choice':
      case 'multiple_choice':
        return ChoiceTaskDataDto;
      case 'gap':
        return GapTaskDataDto;
      case 'listen':
      case 'listening':
        return ListenTaskDataDto;
      case 'speak':
        return SpeakTaskDataDto;
      case 'order':
        return OrderTaskDataDto;
      case 'translate':
        return TranslateTaskDataDto;
      default:
        // Для 'match', 'flashcard', 'matching' и других - пока оставляем общую заглушку
        // В идеале - для них тоже создать DTO
        class DefaultTaskData {}
        return DefaultTaskData;
    }
  })
  data!:
    | ChoiceTaskDataDto
    | GapTaskDataDto
    | ListenTaskDataDto
    | SpeakTaskDataDto
    | OrderTaskDataDto
    | TranslateTaskDataDto
    | Record<string, any>;
}
