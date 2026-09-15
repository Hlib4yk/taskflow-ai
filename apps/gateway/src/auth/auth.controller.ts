import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type { AuthTokens } from "@taskflow/types";
import { CurrentUser, RequestUser } from "../common/current-user.decorator";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

const ACCESS_COOKIE_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.register(dto);
    setAuthCookies(res, tokens);
    return { user };
  }

  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, tokens } = await this.auth.login(dto);
    setAuthCookies(res, tokens);
    return { user };
  }

  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    if (!refreshToken) return { ok: false };
    const tokens = await this.auth.refresh(refreshToken);
    setAuthCookies(res, tokens);
    return { ok: true };
  }

  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    await this.auth.logout(refreshToken);
    res.clearCookie("access_token");
    res.clearCookie("refresh_token", { path: "/auth/refresh" });
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return user;
  }
}

function setAuthCookies(res: Response, tokens: AuthTokens) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie("access_token", tokens.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  });
  res.cookie("refresh_token", tokens.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/auth/refresh",
  });
}
