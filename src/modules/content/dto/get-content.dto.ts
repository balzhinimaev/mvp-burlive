import { IsString, IsOptional, IsEnum, Length } from 'class-validator';

export class GetModulesDto {
  @IsString()
  @Length(5, 20)
  userId!: string;

  @IsOptional()
  @IsEnum(['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  level?: string;

  @IsOptional()
  @IsEnum(['ru', 'en'])
  lang?: string;
}

export class GetLessonsDto {
  @IsString()
  @Length(5, 20)
  userId!: string;

  @IsOptional()
  @IsString()
  moduleRef?: string;

  @IsOptional()
  @IsEnum(['ru', 'en'])
  lang?: string;
}

export class GetLessonDto {
  @IsString()
  @Length(5, 20)
  userId!: string;

  @IsOptional()
  @IsEnum(['ru', 'en'])
  lang?: string;
}
