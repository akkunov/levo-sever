import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCatalogDto } from './dto/create-catalog.dto';
import { UpdateCatalogDto } from './dto/update-catalog.dto';

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const catalogs = await this.prisma.catalog.findMany({
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return catalogs.map((catalog) => ({
      ...catalog,
      count: catalog._count.products,
    }));
  }

  async findBySlug(slug: string) {
    const catalog = await this.prisma.catalog.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: true,
        _count: { select: { products: true } },
      },
    });

    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    return {
      ...catalog,
      count: catalog._count.products,
    };
  }

  async productsBySlug(slug: string, page = 1, limit = 12) {
    const catalog = await this.findBySlug(slug);
    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 12;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { catalogId: catalog.id },
        include: { catalog: true, images: { orderBy: { sortOrder: 'asc' } } },
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where: { catalogId: catalog.id } }),
    ]);

    return { items, total, page: safePage, limit: safeLimit };
  }

  async create(dto: CreateCatalogDto) {
    const name = dto.name?.trim();
    const slug = dto.slug?.trim();

    if (!name || !slug) {
      throw new BadRequestException('Name and slug are required');
    }

    if (dto.parentId) {
      const parent = await this.prisma.catalog.findUnique({
        where: { id: Number(dto.parentId) },
      });

      if (!parent) {
        throw new BadRequestException('Parent catalog not found');
      }
    }

    const existing = await this.prisma.catalog.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Catalog slug already exists');
    }

    return this.prisma.catalog.create({
      data: {
        name,
        slug,
        description: dto.description ?? null,
        image: dto.image ?? null,
        parentId: dto.parentId ? Number(dto.parentId) : null,
      },
    });
  }

  async update(id: number, dto: UpdateCatalogDto) {
    const catalog = await this.prisma.catalog.findUnique({ where: { id } });
    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    if (dto.slug) {
      const exists = await this.prisma.catalog.findUnique({
        where: { slug: dto.slug },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException('Catalog slug already exists');
      }
    }

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('Catalog cannot be its own parent');
      }

      const parent = await this.prisma.catalog.findUnique({
        where: { id: Number(dto.parentId) },
      });
      if (!parent) {
        throw new BadRequestException('Parent catalog not found');
      }

      const descendants = await this.prisma.catalog.findMany({
        where: { parentId: id },
        select: { id: true, parentId: true },
      });
      const isCircular = descendants.some(
        (item) => item.id === Number(dto.parentId),
      );
      if (isCircular) {
        throw new BadRequestException(
          'Circular parent-child relationship is not allowed',
        );
      }
    }

    return this.prisma.catalog.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        slug: dto.slug?.trim() || undefined,
        description: dto.description ?? undefined,
        image: dto.image ?? undefined,
        parentId:
          dto.parentId !== undefined
            ? dto.parentId === null
              ? null
              : Number(dto.parentId)
            : undefined,
      },
    });
  }

  async remove(id: number) {
    const catalog = await this.prisma.catalog.findUnique({
      where: { id },
      include: {
        children: true,
        products: { select: { id: true } },
      },
    });

    if (!catalog) {
      throw new NotFoundException('Catalog not found');
    }

    if (catalog.products.length > 0 || catalog.children.length > 0) {
      throw new BadRequestException(
        'Catalog cannot be deleted because it contains products or child categories.',
      );
    }

    await this.prisma.catalog.delete({ where: { id } });
    return { deleted: true, id };
  }
}
