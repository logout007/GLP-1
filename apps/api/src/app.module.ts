import { Module } from "@nestjs/common";
import { SessionModule } from "./session/session.module";
import { PrismaService } from "./prisma/prisma.service";

@Module({
  imports: [SessionModule],
  providers: [PrismaService],
})
export class AppModule {}
