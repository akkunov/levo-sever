import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadsService } from './uploads.service';

class ReorderImageDto {
  id: number;
  sortOrder: number;
}

@ApiTags('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Post('products/:id/poster')
  @ApiOperation({ summary: 'Upload product poster image (main product image)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  uploadPoster(
    @Param('id', ParseIntPipe) productId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadProductPoster(productId, file);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Post('uploads/images')
  @ApiOperation({ summary: 'Upload one or multiple product images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return this.uploadsService.uploadSingle(files[0]);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Post('products/:id/images')
  @ApiOperation({ summary: 'Upload multiple gallery images for a product' })
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiParam({ name: 'id', example: 1 })
  uploadProductImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.uploadsService.uploadImagesToProduct(id, files);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Patch('products/:id/hero')
  @ApiOperation({ summary: 'Set product hero image by gallery image id' })
  @ApiParam({ name: 'id', example: 1 })
  setHero(
    @Param('id', ParseIntPipe) productId: number,
    @Body() dto: { imageId: number },
  ) {
    return this.uploadsService.setProductHero(productId, dto.imageId);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Patch('products/:id/images/reorder')
  @ApiOperation({ summary: 'Reorder gallery images' })
  @ApiParam({ name: 'id', example: 1 })
  reorderImages(
    @Param('id', ParseIntPipe) productId: number,
    @Body() items: ReorderImageDto[],
  ) {
    return this.uploadsService.reorderImages(productId, items);
  }

  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Delete('products/:id/images/:imageId')
  @ApiOperation({ summary: 'Delete gallery image' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiParam({ name: 'imageId', example: 11 })
  deleteImage(
    @Param('id', ParseIntPipe) productId: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ) {
    return this.uploadsService.deleteImage(productId, imageId);
  }
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Delete('products/:id/poster')
  @ApiOperation({ summary: 'Delete product poster image' })
  @ApiParam({ name: 'id', example: 41 })
  deletePoster(@Param('id', ParseIntPipe) productId: number) {
    return this.uploadsService.deleteProductPoster(productId);
  }
}
