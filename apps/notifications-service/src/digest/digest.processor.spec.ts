import { Test } from "@nestjs/testing";
import type { Job } from "bullmq";
import { DigestProcessor } from "./digest.processor";
import { DigestService } from "./digest.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

describe("DigestProcessor", () => {
  let processor: DigestProcessor;
  let digest: { activeProjectIds: jest.Mock; drain: jest.Mock };
  let realtime: { emitToProject: jest.Mock };

  beforeEach(async () => {
    digest = { activeProjectIds: jest.fn(), drain: jest.fn() };
    realtime = { emitToProject: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        DigestProcessor,
        { provide: DigestService, useValue: digest },
        { provide: RealtimeGateway, useValue: realtime },
      ],
    }).compile();

    processor = module.get(DigestProcessor);
  });

  it("emits a digest for every project with non-zero activity", async () => {
    digest.activeProjectIds.mockResolvedValue(["p1", "p2"]);
    digest.drain.mockImplementation((projectId: string) =>
      Promise.resolve(projectId === "p1" ? { "task.created": "2" } : {}),
    );

    const result = await processor.process({} as Job);

    expect(result).toEqual({ projectsNotified: 1 });
    expect(realtime.emitToProject).toHaveBeenCalledTimes(1);
    expect(realtime.emitToProject).toHaveBeenCalledWith(
      "p1",
      "digest.ready",
      expect.objectContaining({ projectId: "p1", counts: { "task.created": "2" } }),
    );
  });

  it("does nothing when there is no active project", async () => {
    digest.activeProjectIds.mockResolvedValue([]);

    const result = await processor.process({} as Job);

    expect(result).toEqual({ projectsNotified: 0 });
    expect(realtime.emitToProject).not.toHaveBeenCalled();
  });
});
