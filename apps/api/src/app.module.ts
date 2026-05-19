import { Module, Controller, Get } from "@nestjs/common";
import { SessionModule } from "./session/session.module";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class HealthController {
  @Get()
  health() {
    return { status: "ok" };
  }
}

@Module({
  imports: [SessionModule],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
