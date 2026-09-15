import { Test } from "@nestjs/testing";
import { HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { DatabaseHealthIndicator } from "../prisma/prisma.health";

describe("HealthController", () => {
  it("reports ok", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn().mockResolvedValue({ status: "ok" }) } },
        { provide: DatabaseHealthIndicator, useValue: { isHealthy: jest.fn() } },
        { provide: MemoryHealthIndicator, useValue: { checkHeap: jest.fn() } },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.check()).resolves.toEqual({ status: "ok" });
  });
});
