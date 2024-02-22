/* eslint-disable @typescript-eslint/no-explicit-any */
import { Req } from './app/req.ts';
import { Res } from './app/res.ts';
import { uuid } from '../utilities/uuid.ts';
import { parseCookie } from '../../shared/cookie.ts';
import { EventEmitter } from '../../shared/event-emitter.ts';

type Cache = {
    event: string;
    data: any;
};

// type GlobalEvents = {
//     connection: Socket;
// }

// type SocketEvents = {
//     disconnect: void;
//     [event: string]: any;
// }

export class Socket {
    static readonly sockets = new Map<string, Socket>();
    static get(id: string | undefined, io: SocketWrapper): Socket {
        const s = Socket.sockets.get(String(id));
        if (!s) return Socket.build(io);
        s.setTimeout();
        return s;
    }

    static build(io: SocketWrapper): Socket {
        const id = uuid();
        const s = new Socket(id, io);
        io.newIoEvent('connection', s);
        return s;
    }

    timeout: any;
    cache: Cache[] = [];

    constructor(
        public readonly id: string,
        public readonly io: SocketWrapper
    ) {
        Socket.sockets.set(id, this);
        this.timeout = this.setTimeout();
    }

    setTimeout() {
        if (this.timeout) clearTimeout(this.timeout);
        return setTimeout(() => {
            this.disconnect();
        }, 1000 * 60);
    }

    emit(event: string, data: any) {
        this.cache.push({
            event,
            data
        });
    }

    public rooms: string[] = [];

    join(room: string) {
        this.rooms.push(room);
    }

    leave(room: string) {
        this.rooms = this.rooms.filter(r => r !== room);
    }

    private readonly em = new EventEmitter();

    on(event: string, callback: (data?: any) => void) {
        this.em.on(event, callback);
    }

    off(event: string, callback: (data?: any) => void) {
        this.em.off(event, callback);
    }

    newEvent(event: string, data?: any) {
        this.em.emit(event, data);
    }

    disconnect() {
        clearTimeout(this.timeout);
        this.cache = [];
        Socket.sockets.delete(this.id);
        this.newEvent('disconnect');
    }

    broadcast(event: string, data?: any) {
        const sockets = Array.from(Socket.sockets.values())
            .filter(s => s.id !== this.id);
        
        for (const s of sockets) s.emit(event, data);
    }
}


export class SocketWrapper {
    private readonly em = new EventEmitter();

    Socket = Socket;

    middleware() {
        return (req: Req<{
            cache: {
                event: string;
                data: any;
            }[];
            id?: string;
        }>, res: Res) => {
            const { cache, id } = req.body;
            const s = Socket.get(id, this);
            res.json({
                cache: s.cache,
                id: s.id
            });
            s.cache = [];
            s.setTimeout();
            for (const c of cache) s.newEvent(c.event, c.data);
        }
    }

    emit(event: string, data?: any) {
        const sockets = Socket.sockets.values();
        for (const s of sockets) s.emit(event, data);
    }

    to(room: string) {
        const sockets = Array.from(Socket.sockets.values()).filter(s => s.rooms.includes(room));
        return {
            emit(event: string, data: string) {
                for (const s of sockets) s.emit(event, data);
            }
        }
    }

    newIoEvent(event: string, data?: any) {
        this.em.emit(event, data);
    }

    on(event: string, callback: (data?: any) => void) {
        this.em.on(event, callback);
    }

    off(event: string, callback: (data?: any) => void) {
        this.em.off(event, callback);
    }
}



export const io = new SocketWrapper();