/**
 * DashboardServer - Lightweight Real-Time SSE (Server-Sent Events) Bridge
 * Connects Cerebria's EventBus to visual dashboards without heavy WebSocket dependencies.
 */

import * as http from 'http';
import EventBus from '../core/EventBus';

export class DashboardServer {
  private port: number;
  private server: http.Server | null = null;
  private clients: Set<http.ServerResponse> = new Set();
  private systemRef: any;
  private isRunning: boolean = false;

  constructor(system: any, port: number = 3000) {
    this.systemRef = system;
    this.port = port;
  }

  public async start() {
    if (this.isRunning) {
      return;
    }

    this.server = http.createServer((req, res) => {
      // CORS configuration for local dashboard UI
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.url === '/stream') {
        this.handleSSEConnection(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.bindOSListeners();

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, () => {
        console.log(`[Dashboard] 📡 Real-time Telemetry Server running on port ${this.port}`);
        this.isRunning = true;
        resolve();
      });
    });
  }

  public stop() {
    if (this.server) {
      this.server.close();
      this.clients.forEach(client => client.end());
      this.clients.clear();
      this.isRunning = false;
      console.log('[Dashboard] 📡 Telemetry Server offline');
    }
  }

  private handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write('data: {"event": "connected"}\n\n');
    this.clients.add(res);

    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  /**
   * Broadcast structured metrics down the SSE stream
   */
  private broadcast(eventName: string, payload: any) {
    if (this.clients.size === 0) {
      return;
    }
    
    const dataString = JSON.stringify({ event: eventName, data: payload });
    this.clients.forEach(client => {
      try {
        client.write(`data: ${dataString}\n\n`);
      } catch (err) {
        this.clients.delete(client);
      }
    });
  }

  /**
   * Tap directly into the OS EventBus to mirror state to the Web UI
   */
  private bindOSListeners() {
    const bus = EventBus.getInstance();

    // OS Layer Memory and CPU Updates
    bus.on('health:update', (metrics: any) => this.broadcast('health:update', metrics));

    // Task Layer Progress
    bus.on('task:created', (data: any) => this.broadcast('task:created', data));
    bus.on('task:started', (data: any) => this.broadcast('task:started', data));
    bus.on('task:resumed', (data: any) => this.broadcast('task:completed', data));
    bus.on('task:failed', (data: any) => this.broadcast('task:failed', data));

    // Intelligence Layer (AgentEngine can emit streams of its thoughts here)
    bus.on('agent:thought', (data: any) => this.broadcast('agent:thought', data));
    bus.on('agent:tool_call', (data: any) => this.broadcast('agent:tool_call', data));
  }
}
