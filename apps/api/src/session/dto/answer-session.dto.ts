import { IsString, IsNotEmpty, IsNumber, Min, IsDefined } from "class-validator";

export class AnswerSessionDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsNumber()
  @Min(1)
  screenId: number;

  // value can be number | string | string[] — store as JSON
  @IsDefined()
  value: unknown;
}
