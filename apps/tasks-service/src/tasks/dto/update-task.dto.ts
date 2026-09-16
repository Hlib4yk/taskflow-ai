import { TaskPriority } from "@taskflow/types";
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  /** Moving a task to another column (or reordering within one) — see task-board.tsx's drag handler. */
  @IsOptional()
  @IsUUID()
  columnId?: string;

  @IsOptional()
  @IsNumber()
  order?: number;
}
