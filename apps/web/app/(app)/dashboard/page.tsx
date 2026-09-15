"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiFetch<ProjectDto[]>("/projects"),
  });

  const createProject = useMutation({
    mutationFn: (input: { name: string }) =>
      apiFetch<ProjectDto>("/projects", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject.mutate({ name });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <p className="text-sm text-slate-500">Pick a project or start a new one.</p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            placeholder="New project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit" disabled={createProject.isPending}>
            Create
          </Button>
        </form>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {projectsQuery.data?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-medium">{project.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {project.description ?? "No description yet"}
              </p>
            </Card>
          </Link>
        ))}
        {projectsQuery.data?.length === 0 && (
          <p className="text-sm text-slate-500">No projects yet — create your first one above.</p>
        )}
      </div>
    </div>
  );
}
