import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import { JwtPayload } from "../common/decorators/current-user.decorator";

interface CheckinBroadcast {
  checkinId: string;
  userId: string;
  boardId: string;
  timestamp: string;
  method: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: "*",
    credentials: true,
  },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  // ── Connection Lifecycle ──────────────────────────────────

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new UnauthorizedException("No token provided");
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      // Attach user info to socket data
      client.data["user"] = payload;

      this.logger.log(`Client connected: ${client.id} (user: ${payload.email})`);
    } catch (error) {
      this.logger.warn(
        `Connection rejected: ${client.id} — ${error instanceof Error ? error.message : "Unknown"}`,
      );
      client.emit("error", { message: "Authentication failed" });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Room Management ───────────────────────────────────────

  @SubscribeMessage("joinEvent")
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ): void {
    const room = `event:${data.eventId}`;
    client.join(room);

    const user = client.data["user"] as JwtPayload;
    this.logger.log(`User ${user?.email} joined room ${room}`);

    client.emit("joinedEvent", {
      eventId: data.eventId,
      message: `Joined event room`,
    });
  }

  @SubscribeMessage("leaveEvent")
  handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: string },
  ): void {
    const room = `event:${data.eventId}`;
    client.leave(room);

    const user = client.data["user"] as JwtPayload;
    this.logger.log(`User ${user?.email} left room ${room}`);

    client.emit("leftEvent", {
      eventId: data.eventId,
      message: `Left event room`,
    });
  }

  // ── Broadcasting ──────────────────────────────────────────

  /**
   * Broadcast a check-in event to all clients in the event room.
   * Called from CheckinService after successful check-in.
   */
  broadcastCheckin(eventId: string, data: CheckinBroadcast): void {
    const room = `event:${eventId}`;
    this.server.to(room).emit("checkin", data);

    this.logger.debug(`Broadcast checkin to room ${room}: user=${data.userId}`);
  }

  // ── Helpers ───────────────────────────────────────────────

  private extractToken(client: Socket): string | null {
    // Try auth header first, then query param
    const authHeader = client.handshake.headers.authorization;
    if (authHeader) {
      const [, token] = authHeader.split(" ");
      return token ?? null;
    }

    const token = client.handshake.auth?.["token"] as string | undefined;
    return token ?? null;
  }
}
