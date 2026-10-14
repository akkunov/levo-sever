import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateCatalogDto {
  @ApiProperty({
    example: 'Встраиваемая техника',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty({ example: 'built-in-appliances', minLength: 2, maxLength: 120 })
  @IsString()
  @Length(2, 120)
  slug: string;

  @ApiPropertyOptional({
    example: 'Техника для кухни и дома',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/categories/oven.jpg',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  image?: string | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Parent catalog id',
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
