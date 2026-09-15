import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import type { EventPattern } from "@taskflow/types";

/**
 * Thin wrapper around the RabbitMQ ClientProxy so domain services never
 * touch the transport directly — publish() is fire-and-forget by design,
 * other services (ai-service, notifications-service) subscribe independently.
 */
@Injectable()
export class EventsPublisher {
  private readonly logger = new Logger(EventsPublisher.name);

  constructor(
    @Inject("AI_EVENT_BUS") private readonly aiBus: ClientProxy,
    @Inject("NOTIFICATIONS_EVENT_BUS") private readonly notificationsBus: ClientProxy,
  ) {}

  publish<T extends object>(pattern: EventPattern, payload: T): void {
    for (const bus of [this.aiBus, this.notificationsBus]) {
      bus.emit(pattern, payload).subscribe({
        error: (err) => this.logger.error(`Failed to publish ${pattern}`, err),
      });
    }
  }
}
