import { IsIn, IsObject, IsString } from 'class-validator';

export type ApiTaskType =
  | 'choice' | 'gap' | 'match' | 'listen' | 'speak' | 'order' | 'translate'
  | 'multiple_choice' | 'flashcard' | 'listening' | 'matching';

const ALLOWED: ApiTaskType[] = [
  'choice','gap','match','listen','speak','order','translate',
  'multiple_choice','flashcard','listening','matching',
];

export class TaskDto {
  @IsString()
  ref!: string; // a0.travel.001.t1

  @IsString()
  @IsIn(ALLOWED)
  type!: ApiTaskType;

  @IsObject()
  data!: Record<string, any>;
}


