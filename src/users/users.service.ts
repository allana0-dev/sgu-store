import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<SafeUser> {
    const user = await this.prisma.user.create({ data });
    return this.toSafeUser(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: number): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? this.toSafeUser(user) : null;
  }

  async list(limit = 50, page = 1): Promise<SafeUser[]> {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 250) : 50;
    const safePage = Number.isFinite(page) ? Math.max(page, 1) : 1;
    const skip = (safePage - 1) * safeLimit;

    const users = await this.prisma.user.findMany({
      take: safeLimit,
      skip,
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => this.toSafeUser(user));
  }

  async findOneById(id: number): Promise<{ user: SafeUser }> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return { user };
  }

  async update(id: number, dto: UpdateUserDto): Promise<{ user: SafeUser }> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
          ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
        },
      });

      return { user: this.toSafeUser(user) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found.');
        }

        if (error.code === 'P2002') {
          throw new ConflictException('An account with this email already exists.');
        }
      }

      throw error;
    }
  }

  async remove(id: number): Promise<{ message: string; user: SafeUser }> {
    try {
      const deletedUser = await this.prisma.user.delete({ where: { id } });
      return {
        message: 'User deleted successfully.',
        user: this.toSafeUser(deletedUser),
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('User not found.');
      }
      throw error;
    }
  }

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
