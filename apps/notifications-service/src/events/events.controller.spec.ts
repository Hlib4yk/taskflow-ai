import { Test } from "@nestjs/testing";
import { EventsController } from "./events.controller";
import { DigestService } from "../digest/digest.service";
import { RealtimeGateway } from "../realtime/realtime.gateway";

describe("EventsController", () => {
  let controller: EventsController;
  let realtime: { emitToProject: jest.Mock; emitToUser: jest.Mock };
  let digest: { record: jest.Mock };

  beforeEach(async () => {
    realtime = { emitToProject: jest.fn(), emitToUser: jest.fn() };
    digest = { record: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: RealtimeGateway, useValue: realtime },
        { provide: DigestService, useValue: digest },
      ],
    }).compile();

    controller = module.get(EventsController);
  });

  it("forwards task.created to the project room and records it for the digest", () => {
    const payload = { taskId: "t1", projectId: "p1", title: "x", description: null, actorId: "u1" };
    controller.onTaskCreated(payload);

    expect(realtime.emitToProject).toHaveBeenCalledWith("p1", "task.created", payload);
    expect(digest.record).toHaveBeenCalledWith("p1", "task.created");
  });

  it("forwards task.updated to the project room and records it for the digest", () => {
    const payload = { taskId: "t1", projectId: "p1", status: "DONE" as const, actorId: "u1" };
    controller.onTaskUpdated(payload);

    expect(realtime.emitToProject).toHaveBeenCalledWith("p1", "task.updated", payload);
    expect(digest.record).toHaveBeenCalledWith("p1", "task.updated");
  });

  it("forwards comment.created to the project room and records it for the digest", () => {
    const payload = { commentId: "c1", taskId: "t1", projectId: "p1", body: "hi", actorId: "u1" };
    controller.onCommentCreated(payload);

    expect(realtime.emitToProject).toHaveBeenCalledWith("p1", "comment.created", payload);
    expect(digest.record).toHaveBeenCalledWith("p1", "comment.created");
  });

  it("forwards ai.suggestion.ready to the requesting user's room, not the project room", () => {
    const payload = { projectId: "p1", taskId: "t1", userId: "u1", summary: "done" };
    controller.onAiSuggestionReady(payload);

    expect(realtime.emitToUser).toHaveBeenCalledWith("u1", "ai.suggestion.ready", payload);
    expect(realtime.emitToProject).not.toHaveBeenCalled();
    expect(digest.record).not.toHaveBeenCalled();
  });
});
