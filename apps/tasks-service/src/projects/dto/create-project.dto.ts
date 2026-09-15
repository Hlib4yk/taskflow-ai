import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}
