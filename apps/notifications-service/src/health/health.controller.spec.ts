import { Test } from "@nestjs/testing";
import { HealthCheckService } from "@nestjs/terminus";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports ok", async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn().mockResolvedValue({ status: "ok" }) } },
      ],
    }).compile();

    const controller = module.get(HealthController);
    await expect(controller.check()).resolves.toEqual({ status: "ok" });
  });
});
