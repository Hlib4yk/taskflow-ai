import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: "*" });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL ?? "amqp://localhost:5672"],
      queue: "notifications_service_events",
      queueOptions: { durable: true },
      noAck: true,
    },
  });

  await app.startAllMicroservices();

  const port = process.env.NOTIFICATIONS_SERVICE_PORT ?? 3003;
  await app.listen(port);
}

void bootstrap();
