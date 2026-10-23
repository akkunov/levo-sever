import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordPageView(dto: CreatePageViewDto) {
    const path = dto.path.trim();
    if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) {
      throw new BadRequestException('Only public storefront paths can be tracked');
    }

    // Store only the origin of the referrer; query parameters can contain sensitive data.
    let referrer: string | null = null;
    if (dto.referrer) {
      try {
        const parsed = new URL(dto.referrer);
        referrer = parsed.origin;
      } catch {
        referrer = null;
      }
    }

    await this.prisma.analyticsEvent.create({
      data: {
        path: path.slice(0, 2048),
        title: dto.title.trim().slice(0, 200) || path,
        referrer,
        sessionId: dto.sessionId.trim().slice(0, 128),
        occurredAt: new Date(),
      },
      select: { id: true },
    });

    return { accepted: true };
  }

  async getSummary(period: string) {
    if (!['7d', '30d'].includes(period)) {
      throw new BadRequestException('period must be 7d or 30d');
    }

    const to = new Date();
    const from = new Date(to.getTime() - (period === '30d' ? 30 : 7) * 24 * 60 * 60 * 1000);
    const where = { occurredAt: { gte: from, lte: to } };

    const [pageViews, productViews, sessions, popularPaths] = await Promise.all([
      this.prisma.analyticsEvent.count({ where }),
      this.prisma.analyticsEvent.count({
        where: { ...where, path: { startsWith: '/products/' } },
      }),
      this.prisma.analyticsEvent.findMany({
        where,
        distinct: ['sessionId'],
        select: { sessionId: true },
      }),
      this.prisma.analyticsEvent.groupBy({
        by: ['path'],
        where: { ...where, path: { startsWith: '/products/' } },
        _count: { _all: true },
        orderBy: { _count: { path: 'desc' } },
        take: 50,
      }),
    ]);

    const slugViews = popularPaths
      .map((entry) => ({ slug: (() => { const segments = entry.path.split('/').filter(Boolean); return segments[segments.length - 1] ?? ''; })(), views: entry._count._all }))
      .filter((entry) => entry.slug.length > 0);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugViews.map((entry) => entry.slug) } },
      select: { id: true, title: true, slug: true },
    });
    const productBySlug = new Map(products.map((product) => [product.slug, product]));
    const popularProducts = slugViews
      .map((entry) => {
        const product = productBySlug.get(entry.slug);
        return product ? { productId: product.id, productTitle: product.title, views: entry.views } : null;
      })
      .filter((entry): entry is { productId: number; productTitle: string; views: number } => entry !== null)
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      visitors: sessions.length,
      pageViews,
      productViews,
      popularProducts,
      period: { from: from.toISOString(), to: to.toISOString() },
    };
  }
}
