import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export type CEFR = 'A0'|'A1'|'A2'|'B1'|'B2'|'C1'|'C2';

export class CreateModuleDto {
  @IsInt()
  userId!: number;

  @IsString()
  moduleRef!: string; // a0.travel

  @IsEnum(['A0','A1','A2','B1','B2','C1','C2'] as any)
  level!: CEFR;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateModuleDto {
  @IsInt()
  userId!: number;

  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsInt() @Min(0) order?: number;
  @IsOptional() @IsBoolean() published?: boolean;
}


