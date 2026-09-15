import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsPublisher } from "./events.publisher";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "NOTIFICATIONS_EVENT_BUS",
        imports: [ConfigModule],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ as const,
          options: {
            urls: [config.getOrThrow<string>("RABBITMQ_URL")],
            queue: "notifications_service_events",
            queueOptions: { durable: true },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
export class EventsModule {}
