import { ConfigService } from "@nestjs/config";
import { HealthCheckService, MemoryHealthIndicator, MicroserviceHealthIndicator } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports ok", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn().mockResolvedValue({ status: "ok" }) } },
        { provide: MicroserviceHealthIndicator, useValue: { pingCheck: jest.fn() } },
        { provide: MemoryHealthIndicator, useValue: { checkHeap: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: () => "amqp://localhost:5672" } },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.check()).resolves.toEqual({ status: "ok" });
  });
});
