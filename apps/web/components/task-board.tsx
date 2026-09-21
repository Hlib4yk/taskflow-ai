"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Plus, X } from "lucide-react";
import type { ColumnDto, TaskDto } from "@taskflow/types";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TaskComments } from "./task-comments";

function groupByColumn(tasks: TaskDto[]): Map<string, TaskDto[]> {
  const map = new Map<string, TaskDto[]>();
  for (const task of tasks) {
    const list = map.get(task.columnId);
    if (list) list.push(task);
    else map.set(task.columnId, [task]);
  }
  return map;
}

export function TaskBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<TaskDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columnsQuery = useQuery({
    queryKey: ["columns", projectId],
    queryFn: () => apiFetch<ColumnDto[]>(`/columns?projectId=${projectId}`),
  });
  const tasksQuery = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => apiFetch<TaskDto[]>(`/tasks?projectId=${projectId}`),
  });

  const tasks = tasksQuery.data ?? [];
  const columns = columnsQuery.data ?? [];
  const tasksByColumn = groupByColumn(tasks);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const moveTask = useMutation({
    mutationFn: (input: { id: string; columnId: string; order: number }) =>
      apiFetch<TaskDto>(`/tasks/${input.id}`, {
        method: "PATCH",
        body: JSON.stringify({ columnId: input.columnId, order: input.order }),
      }),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      const previous = queryClient.getQueryData<TaskDto[]>(["tasks", projectId]);
      queryClient.setQueryData<TaskDto[]>(["tasks", projectId], (old) =>
        old?.map((t) => (t.id === input.id ? { ...t, columnId: input.columnId, order: input.order } : t)),
      );
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) queryClient.setQueryData(["tasks", projectId], context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const addColumn = useMutation({
    mutationFn: (name: string) =>
      apiFetch<ColumnDto>("/columns", { method: "POST", body: JSON.stringify({ projectId, name }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["columns", projectId] }),
  });

  const renameColumn = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiFetch<ColumnDto>(`/columns/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["columns", projectId] }),
  });

  const deleteColumn = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/columns/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["columns", projectId] });
    },
    onError: () => setError("Move or delete the tasks in that column first."),
  });

  const addTask = useMutation({
    mutationFn: (input: { title: string; columnId: string }) =>
      apiFetch<TaskDto>("/tasks", {
        method: "POST",
        body: JSON.stringify({ title: input.title, projectId, columnId: input.columnId }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === event.active.id) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overId = String(over.id);
    const overIsColumn = columns.some((c) => c.id === overId);
    const targetColumnId = overIsColumn ? overId : (tasks.find((t) => t.id === overId)?.columnId ?? dragged.columnId);

    const siblings = (tasksByColumn.get(targetColumnId) ?? [])
      .filter((t) => t.id !== dragged.id)
      .sort((a, b) => a.order - b.order);

    let order: number;
    const overIndex = siblings.findIndex((t) => t.id === overId);
    if (overIsColumn || overIndex === -1) {
      order = (siblings.at(-1)?.order ?? -1) + 1;
    } else {
      const overTask = siblings[overIndex]!;
      const before = siblings[overIndex - 1];
      order = before ? (before.order + overTask.order) / 2 : overTask.order - 1;
    }

    if (targetColumnId === dragged.columnId && order === dragged.order) return;
    moveTask.mutate({ id: dragged.id, columnId: targetColumnId, order });
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}{" "}
          <button className="underline" onClick={() => setError(null)}>
            dismiss
          </button>
        </p>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex items-start gap-4 overflow-x-auto pb-2">
          {columns.map((column) => (
            <ColumnView
              key={column.id}
              column={column}
              tasks={(tasksByColumn.get(column.id) ?? []).sort((a, b) => a.order - b.order)}
              onRename={(name) => renameColumn.mutate({ id: column.id, name })}
              onDelete={() => deleteColumn.mutate(column.id)}
              onAddTask={(title) => addTask.mutate({ title, columnId: column.id })}
            />
          ))}
          <AddColumn onAdd={(name) => addColumn.mutate(name)} pending={addColumn.isPending} />
        </div>
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeTask && (
            <Card className="w-[16.5rem] rotate-3 cursor-grabbing p-3 shadow-xl ring-1 ring-slate-300">
              <TaskCardBody task={activeTask} />
            </Card>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function ColumnView({
  column,
  tasks,
  onRename,
  onDelete,
  onAddTask,
}: {
  column: ColumnDto;
  tasks: TaskDto[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddTask: (title: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.name);
  const [title, setTitle] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  function submitRename(e: FormEvent) {
    e.preventDefault();
    setEditing(false);
    if (name.trim() && name !== column.name) onRename(name.trim());
  }

  function submitTask(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title.trim());
    setTitle("");
  }

  return (
    <div ref={setNodeRef} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        {editing ? (
          <form onSubmit={submitRename} className="flex-1">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={submitRename}
              className="h-8"
            />
          </form>
        ) : (
          <button
            className="truncate text-sm font-semibold text-slate-700"
            onClick={() => setEditing(true)}
          >
            {column.name}
          </button>
        )}
        <button
          onClick={onDelete}
          className="text-slate-400 hover:text-red-600"
          title="Delete column"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              open={openTaskId === task.id}
              onToggle={() => setOpenTaskId(openTaskId === task.id ? null : task.id)}
            />
          ))}
        </ul>
      </SortableContext>

      <form onSubmit={submitTask} className="mt-2 flex gap-1">
        <Input
          placeholder="+ Add a task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 bg-white text-sm"
        />
      </form>
    </div>
  );
}

function AddColumn({ onAdd, pending }: { onAdd: (name: string) => void; pending: boolean }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim());
    setName("");
    setAdding(false);
  }

  if (!adding) {
    return (
      <button
        onClick={() => setAdding(true)}
        className="flex w-72 shrink-0 items-center gap-1 rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700"
      >
        <Plus className="h-4 w-4" />
        Add column
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
      <Input
        autoFocus
        placeholder="Column name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => !name.trim() && setAdding(false)}
        className="h-8 bg-white"
        disabled={pending}
      />
    </form>
  );
}

function TaskCard({ task, open, onToggle }: { task: TaskDto; open: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="list-none" {...attributes} {...listeners}>
      <Card className="cursor-grab p-3 active:cursor-grabbing">
        <TaskCardBody task={task} />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Comments
        </button>
        {open && <TaskComments taskId={task.id} />}
      </Card>
    </li>
  );
}

function TaskCardBody({ task }: { task: TaskDto }) {
  return (
    <div>
      <p className="font-medium">{task.title}</p>
      {task.description && <p className="mt-1 text-sm text-slate-500">{task.description}</p>}
    </div>
  );
}
