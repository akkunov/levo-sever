import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    example: 'Духовой шкаф LEVO Series 7',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @Length(2, 200)
  title: string;

  @ApiPropertyOptional({ example: 'LV-OV-01', nullable: true })
  @IsOptional()
  @IsString()
  sku?: string | null;

  @ApiPropertyOptional({ example: 'oven-series-7', nullable: true })
  @IsOptional()
  @IsString()
  slug?: string | null;

  @ApiPropertyOptional({ example: 58900, nullable: true })
  @IsOptional()
  @IsNumber()
  price?: number | null;

  @ApiPropertyOptional({ example: 64900, nullable: true })
  @IsOptional()
  @IsNumber()
  oldPrice?: number | null;

  @ApiPropertyOptional({
    example: 'Сдержанный дизайн, точный контроль температуры.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/oven-hero.webp',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({ example: 'Выбор LEVO', nullable: true })
  @IsOptional()
  @IsString()
  tag?: string | null;

  @ApiPropertyOptional({
    example: 'Гарантия 24 месяца',
    nullable: true,
    description: 'Product warranty text shown in the storefront',
  })
  @IsOptional()
  @IsString()
  warranty?: string | null;

  @ApiPropertyOptional({
    example: 'Техника для семьи и повседневной кухни',
    nullable: true,
    description: 'Short product subtitle or marketing blurb',
  })
  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @ApiPropertyOptional({
    example: [
      'Объём 72 л',
      'Класс энергоэффективности A+',
      'Сенсорное управление',
    ],
    type: [String],
    nullable: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specs?: string[];

  @ApiProperty({ example: 1, type: Number })
  @IsInt()
  @Min(1)
  catalogId: number;
}
