import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureFirstAdmin(email: string, password: string, name: string) {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail || !password || !trimmedName) {
      throw new BadRequestException('Email, password and name are required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existing) {
      return {
        created: false,
        message: 'Admin already exists',
        user: {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          role: existing.role,
        },
      };
    }

    const passwordHash = await argon2.hash(password);
    const user = await this.prisma.user.create({
      data: {
        email: trimmedEmail,
        passwordHash,
        name: trimmedName,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return { created: true, user };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async createUser(input: {
    email: string;
    password: string;
    name?: string;
    role?: UserRole;
    isActive?: boolean;
  }) {
    if (!input.email || !input.password) {
      throw new BadRequestException('Email and password are required');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await argon2.hash(input.password);
    return this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name ?? null,
        role: input.role ?? UserRole.MANAGER,
        isActive: input.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }

  async findUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(
    id: number,
    input: {
      email?: string;
      name?: string | null;
      role?: UserRole;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (input.email && input.email !== existing.email) {
      const used = await this.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (used) {
        throw new ConflictException('Email is already in use');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
  }
}
