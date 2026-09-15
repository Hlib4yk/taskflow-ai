import { Test } from "@nestjs/testing";
import { RagService } from "./rag.service";
import { QdrantService } from "./qdrant.service";
import { EmbeddingsService } from "../embeddings/embeddings.service";

describe("RagService", () => {
  let service: RagService;
  let qdrant: { upsert: jest.Mock; search: jest.Mock };
  let embeddings: { embed: jest.Mock };

  beforeEach(async () => {
    qdrant = { upsert: jest.fn().mockResolvedValue(undefined), search: jest.fn() };
    embeddings = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };

    const module = await Test.createTestingModule({
      providers: [
        RagService,
        { provide: QdrantService, useValue: qdrant },
        { provide: EmbeddingsService, useValue: embeddings },
      ],
    }).compile();

    service = module.get(RagService);
  });

  it("indexes a document under a deterministic id per (sourceType, sourceId)", async () => {
    await service.indexDocument({ projectId: "p1", sourceType: "task", sourceId: "t1", text: "Ship it" });
    await service.indexDocument({ projectId: "p1", sourceType: "task", sourceId: "t1", text: "Ship it v2" });

    expect(qdrant.upsert).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = qdrant.upsert.mock.calls;
    expect(firstCall[0].id).toBe(secondCall[0].id);
  });

  it("assigns different ids to different sources", async () => {
    await service.indexDocument({ projectId: "p1", sourceType: "task", sourceId: "t1", text: "Ship it" });
    await service.indexDocument({ projectId: "p1", sourceType: "comment", sourceId: "t1", text: "Ship it" });

    const [firstCall, secondCall] = qdrant.upsert.mock.calls;
    expect(firstCall[0].id).not.toBe(secondCall[0].id);
  });

  it("swallows indexing failures instead of throwing", async () => {
    qdrant.upsert.mockRejectedValue(new Error("qdrant down"));

    await expect(
      service.indexDocument({ projectId: "p1", sourceType: "task", sourceId: "t1", text: "Ship it" }),
    ).resolves.toBeUndefined();
  });

  it("retrieves ranked context chunks for a query", async () => {
    qdrant.search.mockResolvedValue([
      { score: 0.9, payload: { sourceType: "task", sourceId: "t1", text: "Ship it" } },
    ]);

    const results = await service.retrieve("p1", "what's blocking us?");

    expect(embeddings.embed).toHaveBeenCalledWith("what's blocking us?");
    expect(qdrant.search).toHaveBeenCalledWith("p1", [0.1, 0.2, 0.3], 5);
    expect(results).toEqual([{ sourceType: "task", sourceId: "t1", text: "Ship it", score: 0.9 }]);
  });
});
