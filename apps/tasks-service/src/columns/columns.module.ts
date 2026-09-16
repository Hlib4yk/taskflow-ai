import { Module } from "@nestjs/common";
import { ColumnsController } from "./columns.controller";
import { ColumnsService } from "./columns.service";

@Module({
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService],
})
export class ColumnsModule {}
