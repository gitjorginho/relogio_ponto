import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Role } from '@prisma/client';
import {
  userListSelect,
  userPublicSelect,
} from '../common/prisma/user.select';
import { hashPassword } from '../common/utils/password.util';
import { AuthUser } from '../common/interfaces/auth-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, ResetPasswordDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get bcryptRounds(): number {
    const rounds = Number(this.configService.get('BCRYPT_ROUNDS') ?? 10);
    return Number.isInteger(rounds) && rounds >= 4 && rounds <= 15 ? rounds : 10;
  }

  async create(dto: CreateUserDto) {
    const password = await hashPassword(dto.password, this.bcryptRounds);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password,
          role: dto.role ?? Role.EMPLOYEE,
          active: dto.active ?? true,
          registration: dto.registration || null,
          document: dto.document || null,
          department: dto.department || null,
          position: dto.position || null,
          phone: dto.phone || null,
          schedule: { create: dto.schedule ?? {} },
        },
        select: userPublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'E-mail, matrícula ou documento já cadastrado.',
        );
      }
      throw error;
    }
  }

  async findAll(query: QueryUsersDto) {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { name: { contains: query.search } },
        { email: { contains: query.search } },
        { registration: { contains: query.search } },
        { document: { contains: query.search } },
      ];
    }

    if (query.role) {
      where.role = query.role;
    }

    if (query.active !== undefined) {
      where.active = query.active;
    }

    if (query.department) {
      where.department = { contains: query.department };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: userListSelect,
        skip: query.skip,
        take: query.limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });

    if (!target) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    if (target.id === actor.id && dto.active === false) {
      throw new BadRequestException(
        'Não é possível desativar o próprio usuário.',
      );
    }

    const losingAdmin =
      target.role === Role.ADMIN &&
      ((dto.role !== undefined && dto.role !== Role.ADMIN) ||
        dto.active === false);

    if (losingAdmin) {
      if (target.id === actor.id) {
        throw new BadRequestException(
          'Você não pode remover o próprio perfil de administrador.',
        );
      }

      const remainingAdmins = await this.prisma.user.count({
        where: {
          role: Role.ADMIN,
          active: true,
          id: { not: target.id },
        },
      });

      if (remainingAdmins === 0) {
        throw new BadRequestException(
          'O sistema precisa de pelo menos um administrador ativo.',
        );
      }
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.email !== undefined ? { email: dto.email } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.registration !== undefined
            ? { registration: dto.registration || null }
            : {}),
          ...(dto.document !== undefined
            ? { document: dto.document || null }
            : {}),
          ...(dto.department !== undefined
            ? { department: dto.department || null }
            : {}),
          ...(dto.position !== undefined
            ? { position: dto.position || null }
            : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
        },
        select: userPublicSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'E-mail, matrícula ou documento já cadastrado.',
        );
      }
      throw error;
    }
  }

  async deactivate(id: string, actor: AuthUser) {
    const target = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, active: true },
    });

    if (!target) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    if (target.id === actor.id) {
      throw new BadRequestException(
        'Não é possível desativar o próprio usuário.',
      );
    }

    if (!target.active) {
      return { message: 'Funcionário já está desativado.' };
    }

    if (target.role === Role.ADMIN) {
      const remainingAdmins = await this.prisma.user.count({
        where: {
          role: Role.ADMIN,
          active: true,
          id: { not: target.id },
        },
      });

      if (remainingAdmins === 0) {
        throw new BadRequestException(
          'O sistema precisa de pelo menos um administrador ativo.',
        );
      }
    }

    await this.prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return { message: 'Funcionário desativado com sucesso.' };
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('Funcionário não encontrado.');
    }

    const password = await hashPassword(dto.newPassword, this.bcryptRounds);
    await this.prisma.user.update({
      where: { id },
      data: { password },
    });

    return { message: 'Senha redefinida com sucesso.' };
  }
}
