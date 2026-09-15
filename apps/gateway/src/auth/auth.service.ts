import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import type { AuthTokens, AuthUser } from "@taskflow/types";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import type { JwtPayload, RefreshTokenPayload } from "./jwt.strategy";

const SALT_ROUNDS = 10;
// Kept in sync with the cookie maxAge in auth.controller.ts and the default
// JWT_REFRESH_TTL in .env.example — the refresh JWT's own expiry is the
// source of truth for auth, this just bounds how long the DB row is valid.
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

    const { tokens } = await this.issueTokens(user.id, user.email);
    return { user: toAuthUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { tokens } = await this.issueTokens(user.id, user.email);
    return { user: toAuthUser(user), tokens };
  }

  /**
   * Rotates the refresh token on every use: the presented token is revoked
   * and replaced by a new one in the same family. If a token that was
   * already revoked (i.e. already rotated away) is presented again, that's
   * a strong signal it was stolen and replayed — the entire family is
   * revoked, forcing the legitimate user to log in again.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.jti } });
    if (!stored) throw new UnauthorizedException("Invalid refresh token");

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Refresh token reuse detected — please log in again");
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Refresh token expired");
    }

    const { tokens, refreshTokenId } = await this.issueTokens(payload.sub, payload.email, stored.familyId);
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenId: refreshTokenId },
    });

    return tokens;
  }

  /** Best-effort server-side revocation of the presented refresh token on logout. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    const payload = this.jwt.decode<RefreshTokenPayload | null>(refreshToken);
    if (!payload?.jti) return;

    await this.prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issueTokens(
    userId: string,
    email: string,
    familyId?: string,
  ): Promise<{ tokens: AuthTokens; refreshTokenId: string }> {
    const tokenId = randomUUID();
    const resolvedFamilyId = familyId ?? tokenId;

    await this.prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        familyId: resolvedFamilyId,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    const payload: JwtPayload = { sub: userId, email };
    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.config.get<string>("JWT_ACCESS_TTL") ?? "15m",
    });
    const refreshTokenPayload: RefreshTokenPayload = { ...payload, jti: tokenId };
    const refreshToken = this.jwt.sign(refreshTokenPayload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.config.get<string>("JWT_REFRESH_TTL") ?? "7d",
    });

    return { tokens: { accessToken, refreshToken }, refreshTokenId: tokenId };
  }
}

function toAuthUser(user: { id: string; email: string; name: string }): AuthUser {
  return { id: user.id, email: user.email, name: user.name };
}
