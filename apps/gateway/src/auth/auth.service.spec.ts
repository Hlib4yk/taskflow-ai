import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    refreshToken: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock; updateMany: jest.Mock };
  };
  let jwt: { sign: jest.Mock; verify: jest.Mock; decode: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      refreshToken: {
        create: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    jwt = {
      sign: jest
        .fn()
        .mockReturnValueOnce("signed-access-token")
        .mockReturnValueOnce("signed-refresh-token"),
      verify: jest.fn(),
      decode: jest.fn(),
    };

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
    it("creates a user, a refresh-token row, and issues an access/refresh pair", async () => {
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
      expect(result.tokens).toEqual({ accessToken: "signed-access-token", refreshToken: "signed-refresh-token" });
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe("user-1");
      expect(createArgs.data.familyId).toBe(createArgs.data.id); // root token: family == self
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
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
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
    const validPayload = { sub: "user-1", email: "ada@example.com", jti: "token-1" };

    it("rotates a valid, unrevoked token and links the new one as its replacement", async () => {
      jwt.verify.mockReturnValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "token-1",
        familyId: "family-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });

      const tokens = await service.refresh("valid-refresh-token");

      expect(tokens).toEqual({ accessToken: "signed-access-token", refreshToken: "signed-refresh-token" });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: "token-1" },
        data: expect.objectContaining({ revokedAt: expect.any(Date), replacedByTokenId: expect.any(String) }),
      });
      // the new token stays in the same family as the one it replaced
      const createArgs = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArgs.data.familyId).toBe("family-1");
    });

    it("rejects an invalid or expired JWT", async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await expect(service.refresh("bad-token")).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.findUnique).not.toHaveBeenCalled();
    });

    it("rejects a token whose row no longer exists", async () => {
      jwt.verify.mockReturnValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh("valid-refresh-token")).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("revokes the whole token family on reuse of an already-rotated token", async () => {
      jwt.verify.mockReturnValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "token-1",
        familyId: "family-1",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      });

      await expect(service.refresh("stolen-refresh-token")).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { familyId: "family-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.create).not.toHaveBeenCalled();
    });

    it("rejects an expired but otherwise valid token row", async () => {
      jwt.verify.mockReturnValue(validPayload);
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: "token-1",
        familyId: "family-1",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(service.refresh("expired-refresh-token")).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe("logout", () => {
    it("does nothing when no refresh token is presented", async () => {
      await service.logout(undefined);
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it("revokes the presented token's row", async () => {
      jwt.decode.mockReturnValue({ sub: "user-1", email: "ada@example.com", jti: "token-1" });

      await service.logout("some-refresh-token");

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { id: "token-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("does nothing when the token can't be decoded", async () => {
      jwt.decode.mockReturnValue(null);

      await service.logout("garbage");

      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });
  });
});
