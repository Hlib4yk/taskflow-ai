import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock; verify: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue("signed-token"), verify: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => `${key}-secret`,
            get: () => undefined,
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe("register", () => {
    it("creates a user and issues an access/refresh pair", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: "user-1",
        email: "ada@example.com",
        name: "Ada",
        passwordHash: "hashed",
      });

      const result = await service.register({
        email: "ada@example.com",
        password: "password123",
        name: "Ada",
      });

      expect(result.user).toEqual({ id: "user-1", email: "ada@example.com", name: "Ada" });
      expect(result.tokens).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });

    it("rejects a duplicate email", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        service.register({ email: "ada@example.com", password: "password123", name: "Ada" }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("issues tokens for correct credentials", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "ada@example.com",
        name: "Ada",
        passwordHash,
      });

      const result = await service.login({ email: "ada@example.com", password: "password123" });

      expect(result.user.id).toBe("user-1");
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });

    it("rejects an unknown email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "nobody@example.com", password: "whatever" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("rejects a wrong password", async () => {
      const passwordHash = await bcrypt.hash("password123", 10);
      prisma.user.findUnique.mockResolvedValue({
        id: "user-1",
        email: "ada@example.com",
        name: "Ada",
        passwordHash,
      });

      await expect(
        service.login({ email: "ada@example.com", password: "wrong-password" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("refresh", () => {
    it("issues a new token pair for a valid refresh token", () => {
      jwt.verify.mockReturnValue({ sub: "user-1", email: "ada@example.com" });

      const tokens = service.refresh("valid-refresh-token");

      expect(tokens).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
    });

    it("rejects an invalid or expired refresh token", () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      expect(() => service.refresh("bad-token")).toThrow(UnauthorizedException);
    });
  });
});
