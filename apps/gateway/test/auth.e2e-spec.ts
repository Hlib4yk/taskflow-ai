import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import cookieParser from "cookie-parser";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Exercises the real HTTP surface (Nest app + Postgres) rather than mocking
 * Prisma, since auth is exactly the kind of cross-cutting flow (hashing,
 * cookie handling, guard wiring) that unit tests with mocks tend to miss.
 * Requires GATEWAY_DATABASE_URL to point at a reachable Postgres with
 * migrations applied — see the "test" job in .github/workflows/ci.yml.
 */
describe("Auth (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("registers a new user and sets auth cookies", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "password123", name: "E2E User" })
      .expect(201);

    expect(res.body.user).toEqual({ id: expect.any(String), email, name: "E2E User" });
    expect(res.get("Set-Cookie")?.some((c) => c.startsWith("access_token="))).toBe(true);
  });

  it("rejects registering the same email twice", async () => {
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email, password: "password123", name: "E2E User" })
      .expect(409);
  });

  it("logs in and can fetch the current user via /auth/me", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "password123" })
      .expect(201);

    const cookies = loginRes.get("Set-Cookie");
    expect(cookies).toBeDefined();

    const meRes = await request(app.getHttpServer())
      .get("/auth/me")
      .set("Cookie", cookies!)
      .expect(200);

    expect(meRes.body.email).toBe(email);
  });

  it("rejects login with the wrong password", async () => {
    await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "not-the-password" })
      .expect(401);
  });

  it("refreshes and then logs out", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    const cookies = loginRes.get("Set-Cookie")!;

    const refreshRes = await request(app.getHttpServer())
      .post("/auth/refresh")
      .set("Cookie", cookies)
      .expect(201);
    expect(refreshRes.body).toEqual({ ok: true });

    await request(app.getHttpServer()).post("/auth/logout").expect(201);
  });

  it("rejects /auth/me without a session", async () => {
    await request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("detects refresh-token reuse and revokes the whole token family", async () => {
    const server = app.getHttpServer();

    const loginRes = await request(server)
      .post("/auth/login")
      .send({ email, password: "password123" })
      .expect(201);
    const originalCookies = loginRes.get("Set-Cookie")!;

    // First rotation succeeds and mints a new refresh token in the same family.
    const firstRefresh = await request(server)
      .post("/auth/refresh")
      .set("Cookie", originalCookies)
      .expect(201);
    const rotatedCookies = firstRefresh.get("Set-Cookie")!;

    // Replaying the now-rotated-away original token is treated as theft:
    // the whole family (including the token issued above) gets revoked.
    await request(server).post("/auth/refresh").set("Cookie", originalCookies).expect(401);

    await request(server).post("/auth/refresh").set("Cookie", rotatedCookies).expect(401);
  });
});
