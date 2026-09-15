"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { TaskStatus, type TaskDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TaskComments } from "./task-comments";

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
};

export function TaskBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => apiFetch<TaskDto[]>(`/tasks?projectId=${projectId}`),
  });

  const createTask = useMutation({
    mutationFn: (input: { title: string; projectId: string }) =>
      apiFetch<TaskDto>("/tasks", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setTitle("");
      void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      apiFetch<TaskDto>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({ title, projectId });
  }

  return (
    <div className="space-y-4">
      <Card>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input placeholder="New task title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button type="submit" disabled={createTask.isPending}>
            Add task
          </Button>
        </form>
      </Card>

      <ul className="space-y-3">
        {tasksQuery.data?.map((task) => (
          <Card key={task.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{task.title}</p>
                {task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}
              </div>
              <select
                value={task.status}
                onChange={(e) =>
                  updateStatus.mutate({ id: task.id, status: e.target.value as TaskStatus })
                }
                className="h-8 rounded-md border border-slate-300 px-2 text-xs"
              >
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
              className="mt-3 flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
            </button>

            {openTaskId === task.id && <TaskComments taskId={task.id} />}
          </Card>
        ))}
        {tasksQuery.data?.length === 0 && (
          <p className="text-sm text-slate-500">No tasks yet — add the first one above.</p>
        )}
      </ul>
    </div>
  );
}
