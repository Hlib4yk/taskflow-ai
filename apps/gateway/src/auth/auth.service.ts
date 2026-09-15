import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import type { AuthTokens, AuthUser } from "@taskflow/types";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import type { JwtPayload } from "./jwt.strategy";

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash },
    });

    return { user: toAuthUser(user), tokens: this.issueTokens(user.id, user.email) };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return { user: toAuthUser(user), tokens: this.issueTokens(user.id, user.email) };
  }

  refresh(refreshToken: string): AuthTokens {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
      return this.issueTokens(payload.sub, payload.email);
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  private issueTokens(userId: string, email: string): AuthTokens {
    const payload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL") ?? "15m",
    });
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL") ?? "7d",
    });
    return { accessToken, refreshToken };
  }
}

function toAuthUser(user: { id: string; email: string; name: string }): AuthUser {
  return { id: user.id, email: user.email, name: user.name };
}
