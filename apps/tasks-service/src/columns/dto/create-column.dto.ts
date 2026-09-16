import { IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class CreateColumnDto {
  @IsUUID()
  projectId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
