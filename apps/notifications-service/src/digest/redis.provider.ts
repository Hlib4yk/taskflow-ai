import type { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

export const redisClientProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: (config: ConfigService) => new Redis(config.getOrThrow<string>("REDIS_URL")),
  inject: [ConfigService],
};
