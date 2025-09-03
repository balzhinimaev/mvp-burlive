import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { TaskDto } from './task.dto';

export class CreateLessonDto {
  @IsInt()
  userId!: number;

  @IsString()
  moduleRef!: string;

  @IsString()
  lessonRef!: string;

  @IsString()
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsInt() @Min(1)
  estimatedMinutes?: number;

  @IsOptional() @IsInt() @Min(0)
  order?: number;

  @IsOptional() @IsBoolean()
  published?: boolean;

  @IsOptional()
  @IsArray()
  @Type(() => TaskDto)
  tasks?: TaskDto[];
}

export class UpdateLessonDto {
  @IsInt()
  userId!: number;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(1) estimatedMinutes?: number;
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
  @IsOptional() @IsArray() @Type(() => TaskDto) tasks?: TaskDto[];
}


