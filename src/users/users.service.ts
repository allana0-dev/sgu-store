import { Injectable } from '@nestjs/common';
import { Prisma, User } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

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

  toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
