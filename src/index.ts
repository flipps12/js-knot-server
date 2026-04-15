// src/client.ts
import net from 'net';
import { EventEmitter } from 'node:events';

const MAX_PAYLOAD_SIZE = 15 * 1024 * 1024;

export type KnotCommand = 
    | { command: "status" }
    | { command: "newappname", name: string, port: number }
    | { command: "connect", multiaddr: string }
    | { command: "connectrelay", multiaddr: string, peerid: string }
    | { command: "discover", peerid: string };

export class KnotClient extends EventEmitter {
    socket_json: net.Socket | undefined;
    socket_byte: net.Socket | undefined;
    socket_client_byte: net.Socket | undefined;
    server_client_byte: net.Server | undefined;
    private buffer: string = "";
    peerid: String | undefined;


    constructor() {
        super();
        this.setByteSocket();
        this.connectByteSocket();
        this.connectJsonSocket();

        this.setupListeners();

        // Set
        this.peerid = "";
    }


    connectJsonSocket() {
        this.socket_json = net.createConnection({ port: 12012 }, () => {
            console.log('Connected to server');
            this.send_json({ "command": "status" });
        });
    }

    connectByteSocket() {
        this.socket_byte = net.createConnection({ port: 12812 });
    }

    setByteSocket() {
        this.server_client_byte = net.createServer((socket) => {
            this.socket_client_byte = socket;
            console.log('Client connected');
        });
    }

    public send_json(payload: KnotCommand) {
        if (!this.socket_json) throw new Error("Knot: Socket not found");
        let json = JSON.stringify(payload);
        console.log(json);
        this.socket_json.write(json + "\n");
    }

    public async send_bytes(peerId: bigint, appId: bigint, payload: Buffer | Uint8Array): Promise<void> {
        if (!this.socket_byte || this.socket_byte.destroyed) {
            throw new Error("Knot: Socket de bytes no conectado");
        }

        if (payload.length > MAX_PAYLOAD_SIZE) {
            throw new Error(`Knot: El payload excede el límite de 15MB (${payload.length} bytes)`);
        }

        try {
            // Crear header de 24 bytes (Big Endian)
            // Correspondiente a struct.pack(">BBQQIH", ...)
            const header = Buffer.alloc(24);
            
            header.writeUInt8(1, 0);          // Versión
            header.writeUInt8(1, 1);          // Flag
            header.writeBigUInt64BE(peerId, 2); // Peer ID
            header.writeBigUInt64BE(appId, 10); // App ID
            header.writeUInt32BE(payload.length, 18); // Payload Size
            header.writeUInt16BE(0, 22);      // Reservado

            // Enviar Header + Payload
            // socket.write devuelve true si los datos se escribieron en el buffer del kernel
            const success = this.socket_byte.write(Buffer.concat([header, payload]));
            
            if (!success) {
                // Si el buffer está lleno, esperamos al evento 'drain'
                return new Promise((resolve) => {
                    this.socket_byte?.once('drain', resolve);
                });
            }
        } catch (err) {
            this.emit('error', new Error("Error enviando paquete binario: " + err));
            throw err;
        }
    }

    private setupListeners() {
        this.socket_json?.on('data', (chunk: Buffer) => {
            // 1. Agregamos lo nuevo al acumulador
            this.buffer += chunk.toString('utf8');

            // 2. Procesamos el buffer buscando nuestro delimitador (ej: salto de línea)
            let boundary = this.buffer.indexOf('\n');

            while (boundary !== -1) {
                const rawMessage = this.buffer.slice(0, boundary).trim();
                this.buffer = this.buffer.slice(boundary + 1);

                if (rawMessage) {
                    this.handleMessage(rawMessage);
                }
                
                // Buscar el siguiente mensaje en el mismo chunk
                boundary = this.buffer.indexOf('\n');
            }
        });

        this.socket_json?.on('end', () => console.log('Client disconnected'));

        // Socket to send packets
        this.socket_byte?.on('end', () => console.log('Socket Byte disconnected'));

        // Client socket
        this.socket_client_byte?.on('data', (chunk: Buffer) => {
            console.log(chunk);
        });

        this.socket_client_byte?.on('end', () => console.log('Client disconnected'));
    }

    private handleMessage(raw: string) {
        try {
            const data = JSON.parse(raw);
            
            // RE-EMISIÓN DE EVENTOS:
            // Emitimos un evento genérico
            this.emit('message', data);

            // Emitimos eventos específicos basados en el contenido del JSON
            // Si el daemon de Rust envía { "type": "auth_success", "payload": {...} }
            if (data.type) {
                this.emit(data.type, data.payload || data);
            }
        } catch (e) {
            this.emit('error', new Error("Fallo al parsear mensaje de Knot"));
        }
    }

}

