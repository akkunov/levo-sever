import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles(UserRole.ADMIN)
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Roles(UserRole.ADMIN)
  @Post('users')
  createUser(@Body() dto: any) {
    return this.adminService.createUser(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get('users/:id')
  findUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findUserById(id);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.adminService.updateUser(id, dto);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: { isActive: boolean },
  ) {
    return this.adminService.updateUser(id, { isActive: dto.isActive });
  }
}
