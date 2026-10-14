import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login and get JWT access token' })
  @ApiBody({
    type: LoginDto,
    examples: {
      admin: {
        summary: 'Admin login example',
        value: {
          email: 'admin@example.com',
          password: 'StrongPassword123!',
        },
      },
      manager: {
        summary: 'Manager login example',
        value: {
          email: 'manager@example.com',
          password: 'StrongPassword123!',
        },
      },
    },
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  async me(@CurrentUser() user: any) {
    return this.authService.getCurrentUser(Number(user.sub ?? user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOperation({ summary: 'Logout (client discards access token)' })
  logout(@Req() req: any) {
    return {
      ok: true,
      message:
        'Discard the access token on the client side and the session is considered closed.',
    };
  }
}
