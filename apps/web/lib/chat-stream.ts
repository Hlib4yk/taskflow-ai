import { API_URL } from "./config";

export interface ChatStreamEvent {
  token?: string;
  done?: boolean;
  error?: string;
  sources?: { sourceType: string; sourceId: string; text: string; score: number }[];
}

/**
 * POST /chat returns text/event-stream. Browsers' EventSource only supports
 * GET, so we read the stream manually and split on the SSE "\n\n" frame
 * delimiter used by the gateway/ai-service.
 */
export async function* streamChat(
  projectId: string,
  message: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, message }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      yield JSON.parse(line.slice("data:".length).trim()) as ChatStreamEvent;
    }
  }
}
