import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';
import { CatalogsService } from './catalogs.service';

@ApiTags('catalogs')
@Controller('catalogs')
export class CatalogsController {
  constructor(private readonly catalogService: CatalogsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List catalogs with nested children and product counts',
  })
  findAll() {
    return this.catalogService.findAll();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get catalog details by slug' })
  @ApiParam({ name: 'slug', example: 'built-in-appliances' })
  findOne(@Param('slug') slug: string) {
    return this.catalogService.findBySlug(slug);
  }

  @Public()
  @Get(':slug/products')
  @ApiOperation({ summary: 'Get products in a catalog' })
  @ApiParam({ name: 'slug', example: 'built-in-appliances' })
  products(
    @Param('slug') slug: string,
    @Query('page') page = '1',
    @Query('limit') limit = '12',
  ) {
    return this.catalogService.productsBySlug(
      slug,
      Number(page),
      Number(limit),
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Post('admin')
  @ApiOperation({ summary: 'Create catalog (admin only)' })
  @ApiBody({
    type: CreateCatalogDto,
    examples: {
      catalog: {
        summary: 'Catalog creation example',
        value: {
          name: 'Встраиваемая техника',
          slug: 'built-in-appliances',
          description: 'Техника для кухни и дома',
          image: 'https://cdn.example.com/categories/oven.jpg',
          parentId: null,
        },
      },
    },
  })
  create(@Body() dto: CreateCatalogDto) {
    return this.catalogService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update catalog (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    type: UpdateCatalogDto,
    examples: {
      update: {
        summary: 'Catalog update example',
        value: {
          name: 'Встраиваемая техника',
          description: 'Обновленное описание категории',
          image: 'https://cdn.example.com/categories/oven-updated.jpg',
        },
      },
    },
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCatalogDto) {
    return this.catalogService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete catalog (admin only)' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.remove(id);
  }
}
