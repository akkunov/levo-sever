import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AdminService } from './admin.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const adminService = app.get(AdminService);

  const email = process.env.INITIAL_ADMIN_EMAIL || process.argv[2];
  const password = process.env.INITIAL_ADMIN_PASSWORD || process.argv[3];
  const name =
    process.env.INITIAL_ADMIN_NAME || process.argv[4] || 'LEVO Administrator';

  if (!email || !password) {
    console.error('Usage: npm run admin:create <email> <password> [name]');
    process.exit(1);
  }

  const result = await adminService.ensureFirstAdmin(email, password, name);
  console.log(JSON.stringify(result));
  await app.close();
}

bootstrap();
