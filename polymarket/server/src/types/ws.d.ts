declare module 'ws' {
  import { EventEmitter } from 'events';
  import type { IncomingMessage, Server } from 'http';

  export type RawData = string | Buffer | ArrayBuffer | Buffer[];

  export default class WebSocket extends EventEmitter {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;

    constructor(address: string, protocols?: string | string[], options?: unknown);

    readyState: number;
    send(data: unknown, callback?: (err?: Error) => void): void;
    close(code?: number, data?: string): void;
  }

  export interface WebSocketServerOptions {
    server: Server;
    path?: string;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: WebSocketServerOptions);

    on(event: 'connection', listener: (socket: WebSocket, request: IncomingMessage) => void): this;
    on(event: string, listener: (...args: unknown[]) => void): this;

    close(callback?: (err?: Error) => void): void;
  }
}

