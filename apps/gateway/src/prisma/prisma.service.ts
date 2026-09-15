import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
// Imported from the generated output path (not the bare "@prisma/client"
// package) — pnpm symlinks @prisma/client into a shared content-addressable
// store, whose own internal ".prisma/client" lookup resolves relative to
// that store, not to this app's generated client, silently losing all
// model types. Importing straight from the app-local output sidesteps that.
import { PrismaClient } from ".prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
