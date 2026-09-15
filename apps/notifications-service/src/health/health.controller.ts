import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Transport } from "@nestjs/microservices";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator, MicroserviceHealthIndicator } from "@nestjs/terminus";

const MAX_HEAP_BYTES = 300 * 1024 * 1024;

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.microservice.pingCheck("rabbitmq", {
          transport: Transport.RMQ,
          options: { urls: [this.config.getOrThrow<string>("RABBITMQ_URL")] },
        }),
      () => this.memory.checkHeap("memory_heap", MAX_HEAP_BYTES),
    ]);
  }
}
