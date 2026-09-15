import { Test } from "@nestjs/testing";
import { DigestService } from "./digest.service";
import { REDIS_CLIENT } from "./redis.provider";

describe("DigestService", () => {
  let service: DigestService;
  let redis: {
    sadd: jest.Mock;
    hincrby: jest.Mock;
    expire: jest.Mock;
    hgetall: jest.Mock;
    del: jest.Mock;
    srem: jest.Mock;
    smembers: jest.Mock;
  };

  beforeEach(async () => {
    redis = {
      sadd: jest.fn(),
      hincrby: jest.fn(),
      expire: jest.fn(),
      hgetall: jest.fn(),
      del: jest.fn(),
      srem: jest.fn(),
      smembers: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [DigestService, { provide: REDIS_CLIENT, useValue: redis }],
    }).compile();

    service = module.get(DigestService);
  });

  it("records an event by adding the project to the active set and incrementing its counter", async () => {
    await service.record("p1", "task.created");

    expect(redis.sadd).toHaveBeenCalledWith("digest:active-projects", "p1");
    expect(redis.hincrby).toHaveBeenCalledWith("digest:counts:p1", "task.created", 1);
    expect(redis.expire).toHaveBeenCalledWith("digest:counts:p1", 3600);
  });

  it("drains a project's counts and clears its state", async () => {
    redis.hgetall.mockResolvedValue({ "task.created": "2", "comment.created": "1" });

    const counts = await service.drain("p1");

    expect(counts).toEqual({ "task.created": "2", "comment.created": "1" });
    expect(redis.del).toHaveBeenCalledWith("digest:counts:p1");
    expect(redis.srem).toHaveBeenCalledWith("digest:active-projects", "p1");
  });

  it("lists active project ids", async () => {
    redis.smembers.mockResolvedValue(["p1", "p2"]);

    await expect(service.activeProjectIds()).resolves.toEqual(["p1", "p2"]);
  });
});
