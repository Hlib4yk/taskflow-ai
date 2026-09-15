import { z } from "zod";

// ---------------------------------------------------------------------------
// Domain enums
// ---------------------------------------------------------------------------

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  DONE: "DONE",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

// ---------------------------------------------------------------------------
// Projects & tasks
// ---------------------------------------------------------------------------

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  projectId: z.string().uuid(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const createCommentSchema = z.object({
  body: z.string().min(1).max(4000),
  taskId: z.string().uuid(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentDto {
  id: string;
  body: string;
  taskId: string;
  authorId: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// AI / RAG
// ---------------------------------------------------------------------------

export const chatRequestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().min(1).max(4000),
});
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;

export const generateSubtasksSchema = z.object({
  projectId: z.string().uuid(),
  taskId: z.string().uuid(),
  goal: z.string().min(1).max(2000),
});
export type GenerateSubtasksInput = z.infer<typeof generateSubtasksSchema>;

export interface RagSourceChunk {
  sourceType: "task" | "comment" | "project";
  sourceId: string;
  text: string;
  score: number;
}

// ---------------------------------------------------------------------------
// Event bus contracts (RabbitMQ) — shared between publishers and consumers
// ---------------------------------------------------------------------------

export const EVENT_PATTERNS = {
  TASK_CREATED: "task.created",
  TASK_UPDATED: "task.updated",
  COMMENT_CREATED: "comment.created",
  AI_SUGGESTION_READY: "ai.suggestion.ready",
} as const;
export type EventPattern = (typeof EVENT_PATTERNS)[keyof typeof EVENT_PATTERNS];

export interface TaskCreatedEvent {
  taskId: string;
  projectId: string;
  title: string;
  description: string | null;
  actorId: string;
}

export interface TaskUpdatedEvent {
  taskId: string;
  projectId: string;
  status: TaskStatus;
  actorId: string;
}

export interface CommentCreatedEvent {
  commentId: string;
  taskId: string;
  projectId: string;
  body: string;
  actorId: string;
}

export interface AiSuggestionReadyEvent {
  projectId: string;
  taskId: string;
  userId: string;
  summary: string;
}
