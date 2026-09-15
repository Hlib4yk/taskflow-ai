"use client";

import { FormEvent, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import type { TaskDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { streamChat } from "@/lib/chat-stream";
import { useProjectActivity } from "@/lib/use-project-activity";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export function AssistantPanel({ projectId }: { projectId: string }) {
  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => apiFetch<TaskDto[]>(`/tasks?projectId=${projectId}`),
  });
  const activity = useProjectActivity(projectId);

  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [goal, setGoal] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const reindex = useMutation({
    mutationFn: () => apiFetch<{ jobId: string }>(`/projects/${projectId}/reindex`, { method: "POST" }),
  });

  async function onSendMessage(e: FormEvent) {
    e.preventDefault();
    const text = message.trim();
    if (!text || streaming) return;

    setMessage("");
    setTurns((prev) => [...prev, { role: "user", text }, { role: "assistant", text: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const event of streamChat(projectId, text, controller.signal)) {
        if (event.token) {
          setTurns((prev) => {
            const last = prev[prev.length - 1];
            if (!last) return prev;
            const next = prev.slice(0, -1);
            next.push({ role: "assistant", text: last.text + event.token });
            return next;
          });
        }
      }
    } catch {
      // stream aborted or failed — the partial answer already rendered stays visible
    } finally {
      setStreaming(false);
    }
  }

  async function onGenerateSubtasks(e: FormEvent) {
    e.preventDefault();
    if (!selectedTaskId || !goal.trim()) return;
    setGenerating(true);
    setSuggestions([]);
    try {
      const result = await apiFetch<{ suggestions: string[] }>("/subtasks/generate", {
        method: "POST",
        body: JSON.stringify({ projectId, taskId: selectedTaskId, goal }),
      });
      setSuggestions(result.suggestions);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="flex items-center gap-2 font-medium">
          <Sparkles className="h-4 w-4 text-brand-600" />
          Ask about this project
        </h2>
        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm">
          {turns.length === 0 && (
            <p className="text-slate-500">Ask things like &ldquo;what&apos;s blocking us right now?&rdquo;</p>
          )}
          {turns.map((turn, i) => (
            <p key={i} className={turn.role === "user" ? "font-medium text-slate-900" : "text-slate-600"}>
              {turn.role === "user" ? "You: " : "AI: "}
              {turn.text || (streaming && i === turns.length - 1 ? "…" : "")}
            </p>
          ))}
        </div>
        <form onSubmit={onSendMessage} className="mt-3 flex gap-2">
          <Input
            placeholder="Ask the AI assistant..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={streaming}
          />
          <Button type="submit" size="sm" disabled={streaming}>
            Send
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-medium">Generate subtasks</h2>
        <form onSubmit={onGenerateSubtasks} className="mt-3 space-y-2">
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
          >
            <option value="">Select a task...</option>
            {tasksQuery.data?.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>
          <Textarea
            placeholder="Describe the goal, e.g. 'ship the billing page'"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={3}
          />
          <Button type="submit" size="sm" disabled={generating || !selectedTaskId}>
            {generating ? "Generating..." : "Generate"}
          </Button>
        </form>
        {suggestions.length > 0 && (
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-700">
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Live activity</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reindex.mutate()}
            disabled={reindex.isPending}
            title="Re-embed every task/comment in this project into Qdrant (runs as a background job)"
          >
            {reindex.isPending ? "Queuing…" : "Reindex"}
          </Button>
        </div>
        {reindex.data && <p className="mt-1 text-xs text-slate-500">Queued job {reindex.data.jobId}</p>}
        <ul className="mt-3 space-y-1 text-xs text-slate-500">
          {activity.length === 0 && <li>No activity yet.</li>}
          {activity.map((event, i) => (
            <li key={i}>{event.type}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
