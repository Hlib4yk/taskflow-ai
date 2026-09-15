import { Test } from "@nestjs/testing";
import type { Job } from "bullmq";
import { ReindexProcessor } from "./reindex.processor";
import { TasksClientService } from "./tasks-client.service";
import { RagService } from "../rag/rag.service";

describe("ReindexProcessor", () => {
  let processor: ReindexProcessor;
  let tasksClient: { listTasks: jest.Mock; listComments: jest.Mock };
  let rag: { indexDocument: jest.Mock };

  beforeEach(async () => {
    tasksClient = { listTasks: jest.fn(), listComments: jest.fn() };
    rag = { indexDocument: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      providers: [
        ReindexProcessor,
        { provide: TasksClientService, useValue: tasksClient },
        { provide: RagService, useValue: rag },
      ],
    }).compile();

    processor = module.get(ReindexProcessor);
  });

  it("re-indexes every task and comment for a project", async () => {
    tasksClient.listTasks.mockResolvedValue([
      { id: "t1", title: "Ship it", description: "Do the thing", projectId: "p1" },
      { id: "t2", title: "Write docs", description: null, projectId: "p1" },
    ]);
    tasksClient.listComments.mockImplementation((taskId: string) =>
      Promise.resolve(taskId === "t1" ? [{ id: "c1", body: "Looks good", taskId: "t1" }] : []),
    );

    const job = { data: { projectId: "p1" } } as Job<{ projectId: string }>;
    const result = await processor.process(job);

    expect(result).toEqual({ tasksIndexed: 2, commentsIndexed: 1 });
    expect(rag.indexDocument).toHaveBeenCalledWith({
      projectId: "p1",
      sourceType: "task",
      sourceId: "t1",
      text: "Task: Ship it\nDo the thing",
    });
    expect(rag.indexDocument).toHaveBeenCalledWith({
      projectId: "p1",
      sourceType: "comment",
      sourceId: "c1",
      text: "Looks good",
    });
  });

  it("handles a project with no tasks", async () => {
    tasksClient.listTasks.mockResolvedValue([]);

    const job = { data: { projectId: "empty" } } as Job<{ projectId: string }>;
    const result = await processor.process(job);

    expect(result).toEqual({ tasksIndexed: 0, commentsIndexed: 0 });
    expect(rag.indexDocument).not.toHaveBeenCalled();
  });
});
