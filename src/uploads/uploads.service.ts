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
      const key = this.r2.buildObjectKey(file, `products/${productId}`);
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
    } catch (error) {
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

    const updates = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.productImage.updateMany({
          where: { id: item.id, productId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );

    return { updated: updates.length, productId };
  }

  async deleteImage(productId: number, imageId: number) {
    const image = await this.prisma.productImage.findFirst({
      where: { id: imageId, productId },
    });

    if (!image) {
      throw new NotFoundException('Image not found for this product');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.image === image.url) {
      const nextImage = product.images.find((item) => item.id !== imageId);
      await this.prisma.product.update({
        where: { id: productId },
        data: { image: nextImage?.url ?? null },
      });
    }

    try {
      await this.r2.delete(image.url.split('/').pop() ?? '');
    } catch {
      // ignore storage cleanup errors for local demo compatibility
    }

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true, id: imageId };
  }
}
