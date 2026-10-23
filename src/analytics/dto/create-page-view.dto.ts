import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePageViewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  path!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  sessionId!: string;
}
