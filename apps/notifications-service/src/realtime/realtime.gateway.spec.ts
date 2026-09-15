import type { Server, Socket } from "socket.io";
import { RealtimeGateway } from "./realtime.gateway";

describe("RealtimeGateway", () => {
  let gateway: RealtimeGateway;
  let emit: jest.Mock;
  let to: jest.Mock;

  beforeEach(() => {
    gateway = new RealtimeGateway();
    emit = jest.fn();
    to = jest.fn().mockReturnValue({ emit });
    gateway.server = { to } as unknown as Server;
  });

  it("emits to the user's private room", () => {
    gateway.emitToUser("u1", "ai.suggestion.ready", { foo: "bar" });

    expect(to).toHaveBeenCalledWith("user:u1");
    expect(emit).toHaveBeenCalledWith("ai.suggestion.ready", { foo: "bar" });
  });

  it("emits to the project's shared room", () => {
    gateway.emitToProject("p1", "task.created", { foo: "bar" });

    expect(to).toHaveBeenCalledWith("project:p1");
    expect(emit).toHaveBeenCalledWith("task.created", { foo: "bar" });
  });

  it("joins the caller's socket to their user room", () => {
    const join = jest.fn();
    gateway.handleJoin({ join } as unknown as Socket, "u1");

    expect(join).toHaveBeenCalledWith("user:u1");
  });

  it("joins the caller's socket to a project room", () => {
    const join = jest.fn();
    gateway.handleJoinProject({ join } as unknown as Socket, "p1");

    expect(join).toHaveBeenCalledWith("project:p1");
  });
});
