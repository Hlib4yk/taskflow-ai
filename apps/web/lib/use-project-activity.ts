"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { NOTIFICATIONS_URL } from "./config";

export interface ActivityEvent {
  type: string;
  at: number;
  payload: unknown;
}

/** Subscribes to notifications-service's WebSocket gateway for live project activity. */
export function useProjectActivity(projectId: string | undefined) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    if (!projectId) return;

    const socket: Socket = io(`${NOTIFICATIONS_URL}/realtime`, { transports: ["websocket"] });
    socket.emit("join-project", projectId);

    const track = (type: string) => (payload: unknown) =>
      setEvents((prev) => [{ type, at: Date.now(), payload }, ...prev].slice(0, 20));

    socket.on("task.created", track("task.created"));
    socket.on("task.updated", track("task.updated"));
    socket.on("comment.created", track("comment.created"));

    return () => {
      socket.disconnect();
    };
  }, [projectId]);

  return events;
}
