import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Queue } from "bullmq";

const DEFAULT_INTERVAL_MS = 60_000;

/** Registers the repeatable digest job once on boot — upsert is idempotent, safe to run on every restart. */
@Injectable()
export class DigestSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(DigestSchedulerService.name);

  constructor(
    @InjectQueue("digest") private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const every = Number(this.config.get<string>("DIGEST_INTERVAL_MS")) || DEFAULT_INTERVAL_MS;
    await this.queue.upsertJobScheduler("digest-scheduler", { every }, { name: "digest-tick" });
    this.logger.log(`Digest scheduler running every ${every}ms`);
  }
}
