import { IsIn, IsObject, IsString } from 'class-validator';

export type ApiTaskType = 'choice' | 'gap' | 'match' | 'listen' | 'speak' | 'order' | 'translate';

export class TaskDto {
  @IsString()
  ref!: string; // a0.travel.001.t1

  @IsString()
  @IsIn(['choice', 'gap', 'match', 'listen', 'speak', 'order', 'translate'])
  type!: ApiTaskType;

  @IsObject()
  data!: Record<string, any>;
}


