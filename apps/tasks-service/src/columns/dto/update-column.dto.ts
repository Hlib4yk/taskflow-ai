import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;
}
