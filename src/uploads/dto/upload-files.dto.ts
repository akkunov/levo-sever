import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional } from 'class-validator';

export class UploadFilesDto {
  @ApiProperty({
    type: [String],
    format: 'binary',
    description: 'One or more image files',
  })
  @IsOptional()
  @IsArray()
  files?: Express.Multer.File[];
}
