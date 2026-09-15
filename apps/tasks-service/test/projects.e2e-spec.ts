import { ValidationPipe } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Runs against a real Postgres + RabbitMQ (see the "test" job in
 * .github/workflows/ci.yml). tasks-service trusts the x-user-id header set
 * by the gateway (see CurrentUserId), so tests set it directly instead of
 * going through a JWT.
 */
describe("Projects (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const ownerId = `e2e-owner-${Date.now()}`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.project.deleteMany({ where: { ownerId } });
    await app.close();
  });

  it("creates a project, adds a task to it, and lists both back", async () => {
    const server = app.getHttpServer();

    const projectRes = await request(server)
      .post("/projects")
      .set("x-user-id", ownerId)
      .send({ name: "Launch v2" })
      .expect(201);

    const projectId = projectRes.body.id as string;
    expect(projectRes.body.name).toBe("Launch v2");

    const taskRes = await request(server)
      .post("/tasks")
      .set("x-user-id", ownerId)
      .send({ title: "Write the launch email", projectId })
      .expect(201);

    expect(taskRes.body.projectId).toBe(projectId);

    const listRes = await request(server)
      .get("/projects")
      .set("x-user-id", ownerId)
      .expect(200);
    expect(listRes.body.some((p: { id: string }) => p.id === projectId)).toBe(true);

    const tasksRes = await request(server)
      .get(`/tasks?projectId=${projectId}`)
      .expect(200);
    expect(tasksRes.body).toHaveLength(1);
    expect(tasksRes.body[0].title).toBe("Write the launch email");
  });

  it("forbids reading another owner's project", async () => {
    const server = app.getHttpServer();

    const projectRes = await request(server)
      .post("/projects")
      .set("x-user-id", ownerId)
      .send({ name: "Private project" })
      .expect(201);

    await request(server)
      .get(`/projects/${projectRes.body.id}`)
      .set("x-user-id", "someone-else")
      .expect(403);
  });

  it("rejects requests without the x-user-id header", async () => {
    await request(app.getHttpServer()).post("/projects").send({ name: "No owner" }).expect(401);
  });
});
