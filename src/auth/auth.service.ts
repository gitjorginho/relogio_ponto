import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import {
  scheduleSelect,
  userPublicSelect,
} from '../common/prisma/user.select';
import { hashPassword, verifyPassword } from '../common/utils/password.util';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get bcryptRounds(): number {
    const rounds = Number(this.configService.get('BCRYPT_ROUNDS') ?? 10);
    return Number.isInteger(rounds) && rounds >= 4 && rounds <= 15 ? rounds : 10;
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    role: Role;
  }) {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get('JWT_EXPIRES_IN') ?? '1d',
      user,
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }

    const totalUsers = await this.prisma.user.count();
    const role = totalUsers === 0 ? Role.ADMIN : Role.EMPLOYEE;
    const password = await hashPassword(dto.password, this.bcryptRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password,
          role,
          registration: dto.registration || null,
          document: dto.document || null,
          department: dto.department || null,
          position: dto.position || null,
          phone: dto.phone || null,
          schedule: { create: {} },
        },
        select: userPublicSelect,
      });

      return this.buildAuthResponse(user);
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

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { schedule: { select: scheduleSelect } },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const passwordMatches = await verifyPassword(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { password: _password, ...safeUser } = user;
    return this.buildAuthResponse(safeUser);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone || null } : {}),
      },
    });

    return this.me(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, active: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    const passwordMatches = await verifyPassword(
      dto.currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('A senha atual informada está incorreta.');
    }

    const password = await hashPassword(dto.newPassword, this.bcryptRounds);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });

    return { message: 'Senha alterada com sucesso.' };
  }
}
