/** Socket.IO gateway — authenticated parties subscribe to an order's live rider dot (G24/G39).
 *
 * Client (via the API gateway):
 *   io(`${API_BASE_URL}/tracking`, {
 *     path: '/api/tracking/socket.io',
 *     auth: { token: accessToken },
 *   })
 * Direct to this service (dev only):
 *   io(`http://localhost:4106/tracking`, { path: '/tracking/socket.io', auth: { token } })
 */

import { Inject, Logger } from '@nestjs/common';
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
import { TrackingAccessService } from './tracking.access';
import { extractSocketToken } from './tracking.auth';

/** Engine.IO path on this service. The gateway rewrites `/api/tracking` → `/tracking`. */
export const TRACKING_SOCKET_PATH = '/tracking/socket.io';
export const TRACKING_SOCKET_NAMESPACE = '/tracking';

@WebSocketGateway({
  namespace: TRACKING_SOCKET_NAMESPACE,
  path: TRACKING_SOCKET_PATH,
  cors: { origin: true },
})
export class TrackingGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger('TrackingGateway');
  /** Per-order throttle for `revalidateRoom`, keyed by order id. */
  private readonly lastRevalidated = new Map<string, number>();
  private static readonly REVALIDATE_INTERVAL_MS = 30_000;

  constructor(
    @Inject(ORE_ENV) private readonly env: OreEnv,
    private readonly access: TrackingAccessService,
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
    // lifecycle handled by Nest; the decorated server is injected before first message
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
    @MessageBody() body: { orderId?: string },
  ): Promise<void> {
    const user = client.data.user as JwtPayload | undefined;
    if (!user) {
      client.emit('error', { error: { code: 'UNAUTHORIZED', message: 'Missing bearer token', statusCode: 401 } });
      return;
    }
    if (!body?.orderId) {
      client.emit('error', { error: { code: 'BAD_REQUEST', message: 'orderId is required', statusCode: 400 } });
      return;
    }
    const order = await this.access.fetchOrder(body.orderId);
    if (!order || !(await this.access.canView(user, order))) {
      client.emit('error', { error: { code: 'FORBIDDEN', message: 'Not your order', statusCode: 403 } });
      return;
    }
    await client.join(`order:${body.orderId}`);
    client.emit('subscribed', { orderId: body.orderId });
  }

  @SubscribeMessage('unsubscribe')
  onUnsubscribe(@ConnectedSocket() client: Socket, @MessageBody() body: { orderId?: string }): void {
    if (!body?.orderId) return;
    void client.leave(`order:${body.orderId}`);
  }

  emitToOrder(orderId: string, event: string, payload: unknown): void {
    void this.revalidateRoom(orderId);
    this.server?.to(`order:${orderId}`).emit(event, payload);
  }

  /**
   * Re-check that everyone in an order's room is still entitled to be there.
   *
   * Authorisation was previously decided once, at `subscribe`, and never revisited — but the
   * facts it rests on change while the socket is open. A rider reassigned off an order kept
   * receiving the live position of the rider who replaced them, for a delivery that was no
   * longer theirs, until they happened to disconnect. An access token expiring mid-stream
   * changed nothing either: the socket outlives the credential that opened it, so a 15-minute
   * token became an hours-long subscription.
   *
   * Fired off the emit path rather than on a timer so a reassignment takes effect on the very
   * next position update, and throttled per order so a stream of location pings does not turn
   * into a stream of internal lookups.
   */
  async revalidateRoom(orderId: string): Promise<void> {
    const room = `order:${orderId}`;
    const last = this.lastRevalidated.get(orderId) ?? 0;
    const now = Date.now();
    if (now - last < TrackingGateway.REVALIDATE_INTERVAL_MS) return;
    this.lastRevalidated.set(orderId, now);

    const sockets = await this.server?.in(room).fetchSockets();
    if (!sockets?.length) {
      // Nobody is listening, so stop tracking the room's throttle state. Otherwise this map
      // accumulates an entry per order the service has ever emitted for, forever.
      this.lastRevalidated.delete(orderId);
      return;
    }

    const order = await this.access.fetchOrder(orderId);
    for (const socket of sockets) {
      const user = socket.data.user as (JwtPayload & { exp?: number }) | undefined;
      // No order means the lookup failed, not that access was revoked. Evicting on a transient
      // internal-fetch error would drop every viewer of every active delivery whenever the order
      // service hiccups, so only expiry is enforced in that case.
      const expired = typeof user?.exp === 'number' && user.exp * 1000 <= now;
      const allowed = user && !expired && (!order || (await this.access.canView(user, order)));
      if (allowed) continue;

      socket.emit('error', {
        error: { code: 'FORBIDDEN', message: 'Access to this order has ended', statusCode: 403 },
      });
      socket.leave(room);
    }
  }
}
