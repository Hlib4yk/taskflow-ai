import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { CommentsModule } from "./comments/comments.module";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { TasksModule } from "./tasks/tasks.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({ pinoHttp: { level: process.env.NODE_ENV === "production" ? "info" : "debug" } }),
    PrismaModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    HealthModule,
  ],
})
export class AppModule {}
