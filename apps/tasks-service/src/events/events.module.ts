import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventsPublisher } from "./events.publisher";

/**
 * RabbitMQ has no built-in fan-out for @nestjs/microservices' default
 * "queue" transport (two consumers on one queue compete for messages
 * instead of each receiving a copy). Since ai-service and
 * notifications-service both need every event independently, tasks-service
 * publishes to one dedicated queue per subscriber instead of a shared queue
 * — a pragmatic stand-in for a topic/fanout exchange.
 */
const registerEventClient = (name: string, queue: string) => ({
  name,
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    transport: Transport.RMQ as const,
    options: {
      urls: [config.getOrThrow<string>("RABBITMQ_URL")],
      queue,
      queueOptions: { durable: true },
    },
  }),
  inject: [ConfigService],
});

@Module({
  imports: [
    ClientsModule.registerAsync([
      registerEventClient("AI_EVENT_BUS", "ai_service_events"),
      registerEventClient("NOTIFICATIONS_EVENT_BUS", "notifications_service_events"),
    ]),
  ],
  providers: [EventsPublisher],
  exports: [EventsPublisher],
})
export class EventsModule {}
