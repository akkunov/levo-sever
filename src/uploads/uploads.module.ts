import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { CloudflareR2Service } from './storage/cloudflare-r2.service';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsService, CloudflareR2Service],
  exports: [CloudflareR2Service],
})
export class UploadsModule {}
