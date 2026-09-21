"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ProjectDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { AssistantPanel } from "@/components/assistant-panel";
import { TaskBoard } from "@/components/task-board";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const projectQuery = useQuery({
    queryKey: ["project", id],
    queryFn: () => apiFetch<ProjectDto>(`/projects/${id}`),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{projectQuery.data?.name ?? "Loading..."}</h1>
        {projectQuery.data?.description && (
          <p className="text-sm text-slate-500">{projectQuery.data.description}</p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <TaskBoard projectId={id} />
        <AssistantPanel projectId={id} />
      </div>
    </div>
  );
}
