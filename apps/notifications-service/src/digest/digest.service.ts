import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "./redis.provider";

const ACTIVE_PROJECTS_KEY = "digest:active-projects";
const COUNTS_TTL_SECONDS = 60 * 60; // safety net if the scheduler ever stops

export type DigestEventType = "task.created" | "task.updated" | "comment.created";

/**
 * Aggregates project activity between digest ticks in Redis (the first real
 * use of the Redis instance the compose stack always had, per the README's
 * own "Where to go next") — a stand-in for a real digest-email provider,
 * fanned out over the existing Socket.IO project rooms instead.
 */
@Injectable()
export class DigestService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async record(projectId: string, eventType: DigestEventType): Promise<void> {
    const countsKey = `digest:counts:${projectId}`;
    await this.redis.sadd(ACTIVE_PROJECTS_KEY, projectId);
    await this.redis.hincrby(countsKey, eventType, 1);
    await this.redis.expire(countsKey, COUNTS_TTL_SECONDS);
  }

  async drain(projectId: string): Promise<Record<string, string>> {
    const countsKey = `digest:counts:${projectId}`;
    const counts = await this.redis.hgetall(countsKey);
    await this.redis.del(countsKey);
    await this.redis.srem(ACTIVE_PROJECTS_KEY, projectId);
    return counts;
  }

  activeProjectIds(): Promise<string[]> {
    return this.redis.smembers(ACTIVE_PROJECTS_KEY);
  }
}
