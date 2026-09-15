import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import type { EventPattern } from "@taskflow/types";

@Injectable()
export class EventsPublisher {
  private readonly logger = new Logger(EventsPublisher.name);

  constructor(@Inject("NOTIFICATIONS_EVENT_BUS") private readonly client: ClientProxy) {}

  publish<T extends object>(pattern: EventPattern, payload: T): void {
    this.client.emit(pattern, payload).subscribe({
      error: (err) => this.logger.error(`Failed to publish ${pattern}`, err),
    });
  }
}
