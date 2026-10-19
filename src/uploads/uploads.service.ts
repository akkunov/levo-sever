import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from './storage/cloudflare-r2.service';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: CloudflareR2Service,
  ) {}

  async uploadProductPoster(productId: number, file: Express.Multer.File) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!file) {
      throw new BadRequestException('Poster file is required');
    }

    const key = this.r2.buildObjectKey(file, `products/${productId}/poster`);

    try {
      const url = await this.r2.upload(file, key);
      const updated = await this.prisma.product.update({
        where: { id: productId },
        data: { image: url },
      });

      return {
        productId,
        image: updated.image,
        key,
      };
    } catch {
      throw new InternalServerErrorException(
        'Poster upload failed. Check Cloudflare R2 configuration.',
      );
    }
  }

  async uploadImagesToProduct(productId: number, files: Express.Multer.File[]) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file must be uploaded');
    }

    const uploaded = [] as Array<{
      url: string;
      alt: string | null;
      sortOrder: number;
      key: string;
    }>;

    for (const file of files) {
      const key = this.r2.buildObjectKey(file, `products/${productId}/gallery`);
      const url = await this.r2.upload(file, key);
      uploaded.push({
        url,
        alt: file.originalname,
        sortOrder: product.images.length + uploaded.length,
        key,
      });
    }

    const created = await this.prisma.$transaction(
      uploaded.map((item) =>
        this.prisma.productImage.create({
          data: {
            productId,
            url: item.url,
            alt: item.alt,
            sortOrder: item.sortOrder,
          },
        }),
      ),
    );

    return { productId, count: created.length, images: created };
  }

  async uploadSingle(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const key = this.r2.buildObjectKey(file, 'uploads');
    try {
      const url = await this.r2.upload(file, key);
      return { url, key };
    } catch {
      throw new InternalServerErrorException(
        'Image upload failed. Check Cloudflare R2 configuration.',
      );
    }
  }

  async setProductHero(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found for this product');
    }

    const product = await this.prisma.product.update({
      where: { id: productId },
      data: { image: image.url },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });

    return product;
  }

  async reorderImages(
    productId: number,
    items: Array<{ id: number; sortOrder: number }>,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!Array.isArray(items)) {
      throw new BadRequestException('Images must be an array');
    }

    const ids = items.map((item) => item.id);

    if (
      ids.some((id) => !Number.isInteger(id) || id <= 0) ||
      new Set(ids).size !== ids.length ||
      items.some(
        (item) => !Number.isInteger(item.sortOrder) || item.sortOrder < 0,
      )
    ) {
      throw new BadRequestException('Invalid image IDs or sort order');
    }

    const productImageIds = new Set(product.images.map((image) => image.id));

    if (ids.some((id) => !productImageIds.has(id))) {
      throw new BadRequestException('All images must belong to this product');
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.productImage.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return {
      updated: items.length,
      productId,
    };
  }
  async deleteImage(productId: number, imageId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const image = product.images.find((item) => item.id === imageId);

    if (!image) {
      throw new NotFoundException('Image not found for this product');
    }

    const nextImage = product.images.find((item) => item.id !== imageId);

    await this.prisma.$transaction(async (tx) => {
      if (product.image === image.url) {
        await tx.product.update({
          where: { id: productId },
          data: {
            image: nextImage?.url ?? null,
          },
        });
      }

      await tx.productImage.delete({
        where: { id: imageId },
      });
    });

    // Удаляем объект из R2, только если на URL больше никто не ссылается.
    const [productReferences, galleryReferences] = await Promise.all([
      this.prisma.product.count({
        where: { image: image.url },
      }),
      this.prisma.productImage.count({
        where: { url: image.url },
      }),
    ]);

    if (productReferences === 0 && galleryReferences === 0) {
      const key = this.r2.getObjectKeyFromUrl(image.url);

      if (key) {
        await this.r2.delete(key);
      }
    }

    return {
      deleted: true,
      id: imageId,
    };
  }
  async deleteProductPoster(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.image) {
      return {
        deleted: false,
        message: 'Product has no poster',
      };
    }

    const oldImageUrl = product.image;

    // Сначала удаляем ссылку из базы.
    await this.prisma.product.update({
      where: { id: productId },
      data: { image: null },
    });

    // Проверяем, используется ли URL другими товарами
    // или фотографиями галереи.
    const [productReferences, galleryReferences] = await Promise.all([
      this.prisma.product.count({
        where: { image: oldImageUrl },
      }),
      this.prisma.productImage.count({
        where: { url: oldImageUrl },
      }),
    ]);

    let storageDeleted = false;

    if (productReferences === 0 && galleryReferences === 0) {
      const key = this.r2.getObjectKeyFromUrl(oldImageUrl);

      if (key) {
        try {
          await this.r2.delete(key);
          storageDeleted = true;
        } catch {
          // Ссылка уже удалена из БД.
          // Ошибка очистки R2 не должна отменять этот результат.
        }
      }
    }

    return {
      deleted: true,
      productId,
      storageDeleted,
    };
  }
}
