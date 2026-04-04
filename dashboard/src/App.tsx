import { useEffect, useState, useRef } from 'react';
import './index.css';

interface Metrics {
  memoryUsageMB: number;
  cpuLoadAvg: number[];
  uptimeSeconds: number;
}

interface AgentEvent {
  id: string;
  type: 'thinking' | 'tool' | 'synthesis';
  title: string;
  content: string;
  timestamp: string;
}

function App() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [connected, setConnected] = useState(false);
  const [agentStream, setAgentStream] = useState<AgentEvent[]>([]);
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom when new stream events arrive
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentStream]);

  useEffect(() => {
    // Connect to Cerebria DashboardServer SSE endpoint
    const eventSource = new EventSource('http://localhost:3000/stream');

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        const { event, data } = payload;

        if (event === 'health:update') {
          setMetrics(data);
        } else if (event === 'agent:thought') {
          const action = data.action; // 'thinking' | 'synthesis'
          setAgentStream(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            type: action,
            title: action === 'thinking' ? `Reasoning (Context: ${data.messageCount} msgs)` : 'Final Output',
            content: action === 'thinking' ? 'Synthesizing contextual information...' : data.content,
            timestamp: new Date().toLocaleTimeString()
          }]);
        } else if (event === 'agent:tool_call') {
          setAgentStream(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            type: 'tool',
            title: `System Tool: ${data.tool}`,
            content: JSON.stringify(data.args, null, 2),
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
      } catch (err) {
        // Parse error, usually the initial {"event":"connected"} structure
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="dashboard-container">
      {/* Header spanning top */}
      <div className="header">
        <h1 className="header-title">Cerebria / OS</h1>
        <div className="status-badge">
          <div className={`status-dot ${connected ? 'online' : 'offline'}`} />
          {connected ? 'KERNEL ONLINE' : 'DISCONNECTED'}
        </div>
      </div>

      {/* Left Sidebar: OS Vitals */}
      <div className="sidebar">
        <div className="card">
          <div className="card-title">Memory Allocation</div>
          <div className="metric-value">
            {metrics ? `${metrics.memoryUsageMB.toFixed(1)}` : '---'}
            <span style={{fontSize: '1rem', color: 'var(--text-secondary)'}}> MB</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">System Load (1m, 5m, 15m)</div>
          <div className="metric-value">
            {metrics?.cpuLoadAvg ? (
              <span style={{fontSize: '1.25rem'}}>
                {metrics.cpuLoadAvg.map(n => n.toFixed(2)).join(' / ')}
              </span>
            ) : '---'}
          </div>
        </div>

        <div className="card">
          <div className="card-title">OS Uptime</div>
          <div className="metric-sub">
            {metrics ? `${Math.floor(metrics.uptimeSeconds)} seconds` : 'System sleeping'}
          </div>
        </div>
      </div>

      {/* Main Area: Agent Intent Stream */}
      <div className="main-view card stream-card">
        <div className="card-title">Agent Thought Process</div>
        
        <div className="stream-container">
          {agentStream.length === 0 ? (
            <div style={{color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem'}}>
              Waiting for agent activity...
            </div>
          ) : (
            agentStream.map((item) => (
              <div key={item.id} className={`agent-node ${item.type}`}>
                {item.type === 'thinking' ? (
                  <>
                    <div className="typing-dots"><span></span><span></span><span></span></div>
                    <span style={{fontSize: '0.875rem'}}>{item.title}</span>
                  </>
                ) : (
                  <>
                    <div className="node-header">{item.title} <span style={{fontWeight: 400, opacity: 0.5, float: 'right'}}>{item.timestamp}</span></div>
                    <div className="node-content">{item.content}</div>
                  </>
                )}
              </div>
            ))
          )}
          <div ref={streamEndRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
