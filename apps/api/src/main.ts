import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: "http://localhost:3000" });
  await app.listen(process.env.PORT ?? 4000);
  console.log(`API running on http://localhost:${process.env.PORT ?? 4000}`);
}
bootstrap();
