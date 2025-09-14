import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
export type CEFR = 'A0'|'A1'|'A2'|'B1'|'B2'|'C1'|'C2';

export class CreateModuleDto {
  @IsString()
  moduleRef!: string; // a0.travel

  @IsString()
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

  @IsOptional()
  @IsBoolean()
  requiresPro?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}

export class UpdateModuleDto extends CreateModuleDto {}


