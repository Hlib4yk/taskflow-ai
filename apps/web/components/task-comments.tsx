"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TaskComments({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");

  const commentsQuery = useQuery({
    queryKey: ["comments", taskId],
    queryFn: () => apiFetch<CommentDto[]>(`/comments?taskId=${taskId}`),
  });

  const addComment = useMutation({
    mutationFn: (input: { body: string; taskId: string }) =>
      apiFetch<CommentDto>("/comments", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    addComment.mutate({ body, taskId });
  }

  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      <ul className="space-y-2">
        {commentsQuery.data?.map((comment) => (
          <li key={comment.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {comment.body}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          placeholder="Add a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={addComment.isPending}>
          Post
        </Button>
      </form>
    </div>
  );
}
