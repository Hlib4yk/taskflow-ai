import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { AiProxyController } from "./ai-proxy.controller";
import { TasksProxyController } from "./tasks-proxy.controller";

@Module({
  imports: [HttpModule],
  controllers: [TasksProxyController, AiProxyController],
})
export class ProxyModule {}
