import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { SessionService } from "./session.service";
import { AnswerSessionDto } from "./dto/answer-session.dto";

@Controller("session")
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post("start")
  startSession() {
    return this.sessionService.startSession();
  }

  @Get(":id")
  getSession(@Param("id") id: string) {
    return this.sessionService.getSession(id);
  }

  @Post("answer")
  saveAnswer(@Body() body: AnswerSessionDto) {
    return this.sessionService.saveAnswer(body.sessionId, body.screenId, body.value);
  }
}
