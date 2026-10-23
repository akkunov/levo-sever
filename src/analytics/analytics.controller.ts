import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AnalyticsService } from './analytics.service';
import { CreatePageViewDto } from './dto/create-page-view.dto';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Public()
  @Post('events')
  @ApiOperation({ summary: 'Record an anonymous storefront page view' })
  recordPageView(@Body() dto: CreatePageViewDto) {
    return this.analyticsService.recordPageView(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @Get('admin/summary')
  @ApiOperation({ summary: 'Get page-view and product analytics for administrators' })
  getSummary(@Query('period') period = '7d') {
    return this.analyticsService.getSummary(period);
  }
}
