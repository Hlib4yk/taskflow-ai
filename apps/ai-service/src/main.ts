import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  // Hybrid app: HTTP for the gateway (chat/subtasks) + RMQ consumer for
  // background indexing of task/comment events published by tasks-service.
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? "amqp://localhost:5672"],
      queue: "ai_service_events",
      queueOptions: { durable: true },
      noAck: true,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.AI_SERVICE_PORT ?? 3002;
  await app.listen(port);
}

void bootstrap();
