/** Socket.IO gateway — authenticated parties subscribe to an order or support thread.
 *
 * Client (via the API gateway):
 *   io(`${API_BASE_URL}/comms`, {
 *     path: '/api/comms/socket.io',
 *     auth: { token: accessToken },
 *   })
 */

import { Inject, Logger, forwardRef } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ORE_ENV, JwtPayload, verifyToken } from '@ore/core';
import { OreEnv } from '@ore/config';
import { extractSocketToken } from './comms.auth';
import { CommsService } from './comms.service';

export const COMMS_SOCKET_PATH = '/comms/socket.io';
export const COMMS_SOCKET_NAMESPACE = '/comms';

@WebSocketGateway({
  namespace: COMMS_SOCKET_NAMESPACE,
  path: COMMS_SOCKET_PATH,
  cors: { origin: true },
})
export class CommsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('CommsGateway');
  /** Per-thread throttle for `revalidateRoom`, keyed by thread id. */
  private readonly lastRevalidated = new Map<string, number>();
  private static readonly REVALIDATE_INTERVAL_MS = 30_000;

  constructor(
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(forwardRef(() => CommsService)) private readonly comms: CommsService,
  ) {}

  @WebSocketServer()
  server!: Server;

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const token = extractSocketToken(socket.handshake);
      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }
      try {
        socket.data.user = verifyToken(this.env, token);
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  init(): void {
    // lifecycle handled by Nest
  }

  handleConnection(client: Socket): void {
    const user = client.data.user as JwtPayload | undefined;
    this.logger.log(`socket connected: ${client.id}${user ? ` user=${user.sub}` : ''}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { threadId?: string; orderId?: string },
  ): Promise<void> {
    const user = client.data.user as JwtPayload | undefined;
    if (!user) {
      client.emit('error', { error: { code: 'UNAUTHORIZED', message: 'Missing bearer token', statusCode: 401 } });
      return;
    }
    const thread = body?.threadId
      ? await this.comms.findThread(body.threadId)
      : body?.orderId
        ? await this.comms.findThreadByOrder(body.orderId)
        : null;
    if (!thread) {
      client.emit('error', { error: { code: 'NOT_FOUND', message: 'Thread not found', statusCode: 404 } });
      return;
    }
    if (!(await this.comms.canAccessThread(user, thread))) {
      client.emit('error', { error: { code: 'FORBIDDEN', message: 'Not your thread', statusCode: 403 } });
      return;
    }
    await client.join(`thread:${thread.id}`);
    client.emit('subscribed', { threadId: thread.id, orderId: thread.orderId, kind: thread.kind });
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { threadId?: string }): void {
    if (!body?.threadId) return;
    void client.leave(`thread:${body.threadId}`);
  }

  emitToThread(threadId: string, event: string, payload: unknown): void {
    void this.revalidateRoom(threadId);
    this.server?.to(`thread:${threadId}`).emit(event, payload);
  }

  /**
   * Re-check that everyone in a thread's room is still entitled to be there.
   *
   * Access was decided once at `subscribe` and never revisited, but a thread's membership is
   * derived from the order's current rider. Reassign an order and the previous rider's socket
   * carries on receiving the customer's messages — not metadata, the message bodies — for a
   * delivery that is no longer theirs. Token expiry was likewise never enforced after the
   * handshake, so a 15-minute credential bought an open-ended subscription.
   */
  async revalidateRoom(threadId: string): Promise<void> {
    const room = `thread:${threadId}`;
    const now = Date.now();
    if (now - (this.lastRevalidated.get(threadId) ?? 0) < CommsGateway.REVALIDATE_INTERVAL_MS) return;
    this.lastRevalidated.set(threadId, now);

    const sockets = await this.server?.in(room).fetchSockets();
    if (!sockets?.length) {
      this.lastRevalidated.delete(threadId);
      return;
    }

    const thread = await this.comms.findThread(threadId);
    for (const socket of sockets) {
      const user = socket.data.user as (JwtPayload & { exp?: number }) | undefined;
      // A missing thread here means the lookup failed, not that the thread was deleted; evicting
      // on a transient error would empty every live chat whenever the database blinks.
      const expired = typeof user?.exp === 'number' && user.exp * 1000 <= now;
      const allowed = user && !expired && (!thread || (await this.comms.canAccessThread(user, thread)));
      if (allowed) continue;

      socket.emit('error', {
        error: { code: 'FORBIDDEN', message: 'Access to this thread has ended', statusCode: 403 },
      });
      socket.leave(room);
    }
  }
}
