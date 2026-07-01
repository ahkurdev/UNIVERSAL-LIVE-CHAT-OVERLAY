import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ChatMessage } from '../shared/types';

let server: http.Server | null = null;
let wss: WebSocketServer | null = null;
let port = 3000;
let statusCb: ((status: string, url: string) => void) | null = null;

export function obsServerSetStatusCb(cb: (status: string, url: string) => void) {
  statusCb = cb;
}

export function obsServerStart(serverPort: number, overlayHtmlPath: string): void {
  if (server) obsServerStop();
  port = serverPort;

  const app = express();

  // Serve the OBS overlay HTML
  app.get('/', (_req, res) => {
    res.sendFile(overlayHtmlPath);
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', clients: wss?.clients?.size || 0 });
  });

  server = http.createServer(app);

  // WebSocket for real-time messages
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log(`[OBS] Client connected (total: ${wss?.clients?.size || 0})`);
    ws.on('close', () => {
      console.log(`[OBS] Client disconnected (total: ${wss?.clients?.size || 0})`);
    });
  });

  server.listen(port, '0.0.0.0', () => {
    const url = `http://localhost:${port}`;
    console.log(`[OBS] Server started on ${url}`);
    statusCb?.('running', url);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[OBS] Port ${port} already in use`);
      statusCb?.('error', `Port ${port} already in use`);
    } else {
      console.error('[OBS] Server error:', err);
      statusCb?.('error', err.message);
    }
  });
}

export function obsServerStop(): void {
  wss?.close();
  server?.close();
  wss = null;
  server = null;
  statusCb?.('stopped', '');
  console.log('[OBS] Server stopped');
}

export function obsServerBroadcastMessages(messages: ChatMessage[]): void {
  if (!wss) return;
  const data = JSON.stringify({ type: 'messages', data: messages });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function obsServerBroadcastSettings(settings: any): void {
  if (!wss) return;
  const data = JSON.stringify({ type: 'settings', data: settings });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

export function obsServerIsRunning(): boolean {
  return server !== null;
}

export function obsServerGetPort(): number {
  return port;
}
