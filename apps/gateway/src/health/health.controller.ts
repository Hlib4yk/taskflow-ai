import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";
import { DatabaseHealthIndicator } from "../prisma/prisma.health";

const MAX_HEAP_BYTES = 300 * 1024 * 1024;

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DatabaseHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.database.isHealthy("database"),
      () => this.memory.checkHeap("memory_heap", MAX_HEAP_BYTES),
    ]);
  }
}
