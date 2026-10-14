import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
  imports: [PrismaModule],
  providers: [CatalogsService],
  controllers: [CatalogsController],
  exports: [CatalogsService],
})
export class CatalogsModule {}
