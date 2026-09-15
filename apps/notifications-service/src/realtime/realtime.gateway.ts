import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

/**
 * Browser clients join a room named after their userId (sent right after
 * connecting) so events can be targeted at "everyone watching project X" or
 * "this specific user" without a shared session store.
 */
@WebSocketGateway({ cors: { origin: "*" }, namespace: "/realtime" })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage("join")
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() userId: string) {
    void client.join(`user:${userId}`);
  }

  @SubscribeMessage("join-project")
  handleJoinProject(@ConnectedSocket() client: Socket, @MessageBody() projectId: string) {
    void client.join(`project:${projectId}`);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload);
  }

  emitToProject(projectId: string, event: string, payload: unknown) {
    this.server.to(`project:${projectId}`).emit(event, payload);
  }
}
