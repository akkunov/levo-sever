import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: any) {
    const page = Math.max(1, Number(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 12)));
    const search = String(query.search ?? '').trim();
    const catalogId = query.catalogId ? Number(query.catalogId) : undefined;
    const minPrice =
      query.minPrice != null ? Number(query.minPrice) : undefined;
    const maxPrice =
      query.maxPrice != null ? Number(query.maxPrice) : undefined;
    const sort = String(query.sort ?? 'newest');

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (catalogId) {
      where.catalogId = catalogId;
    }
    if (minPrice != null || maxPrice != null) {
      where.price = {};
      if (minPrice != null) {
        where.price.gte = minPrice;
      }
      if (maxPrice != null) {
        where.price.lte = maxPrice;
      }
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'price_asc'
        ? { price: 'asc' }
        : sort === 'price_desc'
          ? { price: 'desc' }
          : sort === 'oldest'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title is required');
    }
    if (!dto.catalogId) {
      throw new BadRequestException('Catalog is required');
    }

    const catalog = await this.prisma.catalog.findUnique({
      where: { id: Number(dto.catalogId) },
    });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    const title = dto.title.trim();
    const slugValue = (
      dto.slug ??
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
    ).trim();

    if (dto.sku) {
      const exists = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (exists) {
        throw new ConflictException('SKU already exists');
      }
    }

    if (slugValue) {
      const exists = await this.prisma.product.findUnique({
        where: { slug: slugValue },
      });
      if (exists) {
        throw new ConflictException('Slug already exists');
      }
    }

    return this.prisma.product.create({
      data: {
        title,
        sku: dto.sku ?? null,
        slug: slugValue || null,
        price: dto.price ?? null,
        oldPrice: dto.oldPrice ?? null,
        description: dto.description ?? null,
        image: dto.image ?? null,
        tag: dto.tag ?? null,
        subtitle: dto.subtitle ?? null,
        warranty: dto.warranty ?? null,
        specs: Array.isArray(dto.specs) ? dto.specs : [],
        catalogId: Number(dto.catalogId),
      },
      include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (dto.catalogId) {
      const catalog = await this.prisma.catalog.findUnique({
        where: { id: Number(dto.catalogId) },
      });
      if (!catalog) {
        throw new NotFoundException('Catalog not found');
      }
    }

    if (dto.sku && dto.sku !== existing.sku) {
      const skuExists = await this.prisma.product.findUnique({
        where: { sku: dto.sku },
      });
      if (skuExists && skuExists.id !== id) {
        throw new ConflictException('SKU already exists');
      }
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugExists = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (slugExists && slugExists.id !== id) {
        throw new ConflictException('Slug already exists');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        title: dto.title?.trim() || undefined,
        sku: dto.sku !== undefined ? dto.sku : undefined,
        slug: dto.slug !== undefined ? dto.slug : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        oldPrice: dto.oldPrice !== undefined ? dto.oldPrice : undefined,
        description:
          dto.description !== undefined ? dto.description : undefined,
        image: dto.image !== undefined ? dto.image : undefined,
        tag: dto.tag !== undefined ? dto.tag : undefined,
        subtitle: dto.subtitle !== undefined ? dto.subtitle : undefined,
        warranty: dto.warranty !== undefined ? dto.warranty : undefined,
        specs: dto.specs !== undefined ? dto.specs : undefined,
        catalogId:
          dto.catalogId !== undefined ? Number(dto.catalogId) : undefined,
      },
      include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async remove(id: number) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({ where: { id } });
    return { deleted: true, id };
  }
}
