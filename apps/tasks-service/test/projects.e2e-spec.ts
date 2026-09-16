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
    // EventsPublisher.publish() is fire-and-forget (see events.publisher.ts)
    // — closing the app immediately after the last request can race an
    // in-flight RabbitMQ confirm and crash the process with an unhandled
    // "Channel ended" error from amqp-connection-manager. Give it a moment
    // to settle first.
    await new Promise((resolve) => setTimeout(resolve, 200));
    await app.close();
  });

  it("creates a project seeded with default columns, adds a task to one, and lists both back", async () => {
    const server = app.getHttpServer();

    const projectRes = await request(server)
      .post("/projects")
      .set("x-user-id", ownerId)
      .send({ name: "Launch v2" })
      .expect(201);

    const projectId = projectRes.body.id as string;
    expect(projectRes.body.name).toBe("Launch v2");

    const columnsRes = await request(server).get(`/columns?projectId=${projectId}`).expect(200);
    expect(columnsRes.body.map((c: { name: string }) => c.name)).toEqual([
      "To Do",
      "In Progress",
      "Done",
    ]);
    const todoColumnId = columnsRes.body[0].id as string;

    const taskRes = await request(server)
      .post("/tasks")
      .set("x-user-id", ownerId)
      .send({ title: "Write the launch email", projectId, columnId: todoColumnId })
      .expect(201);

    expect(taskRes.body.projectId).toBe(projectId);
    expect(taskRes.body.columnId).toBe(todoColumnId);

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

    // Moving the task to another column...
    const inProgressColumnId = columnsRes.body[1].id as string;
    const movedRes = await request(server)
      .patch(`/tasks/${taskRes.body.id}`)
      .set("x-user-id", ownerId)
      .send({ columnId: inProgressColumnId, order: 0 })
      .expect(200);
    expect(movedRes.body.columnId).toBe(inProgressColumnId);

    // ...blocks deleting a column that still has a task in it...
    await request(server).delete(`/columns/${inProgressColumnId}`).expect(409);

    // ...but a brand-new empty column can be added and removed freely.
    const newColumnRes = await request(server)
      .post("/columns")
      .send({ projectId, name: "Blocked" })
      .expect(201);
    await request(server).delete(`/columns/${newColumnRes.body.id}`).expect(204);
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
