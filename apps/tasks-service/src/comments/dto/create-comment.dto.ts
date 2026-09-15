import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsUUID()
  taskId!: string;
}
