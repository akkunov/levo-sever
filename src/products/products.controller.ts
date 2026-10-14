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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'List products with search, pagination, and filters',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 12 })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    example: 'духовой',
  })
  @ApiQuery({ name: 'catalogId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, example: 20000 })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    example: 100000,
  })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findMany(query);
  }

  @Public()
  @Get('featured')
  @ApiOperation({ summary: 'List featured products' })
  featured() {
    return this.productsService.findMany({ page: 1, limit: 8, sort: 'newest' });
  }

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search products by title or SKU' })
  @ApiQuery({ name: 'q', required: true, type: String, example: 'LEVO' })
  search(@Query('q') q: string) {
    return this.productsService.findMany({ search: q, page: 1, limit: 12 });
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Get product detail by slug' })
  @ApiParam({ name: 'slug', example: 'oven-series-7' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Post('admin')
  @ApiOperation({ summary: 'Create product (admin or manager)' })
  @ApiBody({
    type: CreateProductDto,
    examples: {
      product: {
        summary: 'Product creation example',
        value: {
          title: 'Духовой шкаф LEVO Series 7',
          sku: 'LV-OV-01',
          slug: 'oven-series-7',
          price: 58900,
          oldPrice: 64900,
          description: 'Сдержанный дизайн, точный контроль температуры.',
          image: 'https://cdn.example.com/oven-hero.webp',
          tag: 'Выбор LEVO',
          specs: [
            'Объём 72 л',
            'Класс энергоэффективности A+',
            'Сенсорное управление',
          ],
          catalogId: 1,
        },
      },
    },
  })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update product by id' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiBody({
    type: UpdateProductDto,
    examples: {
      update: {
        summary: 'Product update example',
        value: {
          title: 'Духовой шкаф LEVO Series 7',
          price: 56900,
          oldPrice: 62900,
          image: 'https://cdn.example.com/oven-hero-v2.webp',
          tag: 'Акция',
          specs: ['Объём 72 л', 'Сенсорное управление'],
        },
      },
    },
  })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete product by id' })
  @ApiParam({ name: 'id', example: 1 })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
