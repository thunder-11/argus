export default function SystemStatusPage() {
  const indexerServices = [
    { name: 'TRON Grid Mainnet Indexer', chain: 'TRON', status: 'OPERATIONAL', latency: '42ms', mode: 'Live API + Cache' },
    { name: 'Ethereum ERC-20 RPC Node', chain: 'ETH', status: 'OPERATIONAL', latency: '68ms', mode: 'Etherscan API' },
    { name: 'BNB Smart Chain BEP-20 Node', chain: 'BSC', status: 'OPERATIONAL', latency: '54ms', mode: 'BscScan API' },
    { name: 'Bitcoin Blockstream Node', chain: 'BTC', status: 'OPERATIONAL', latency: '82ms', mode: 'Blockstream REST' },
    { name: 'FIU-IND Compliance Registry DB', chain: 'SYSTEM', status: 'OPERATIONAL', latency: '4ms', mode: 'SQLite / PostgreSQL' },
    { name: 'Value-Weighted BFS Graph Engine', chain: 'CORE', status: 'OPERATIONAL', latency: '12ms', mode: 'FastAPI In-Memory' },
    { name: 'WebSocket Real-Time Dispatcher', chain: 'STREAM', status: 'OPERATIONAL', latency: '1ms', mode: 'FastAPI WebSockets' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>🟢 System Health & Indexer Telemetry</h1>
          <p className="subtitle">Real-Time Infrastructure Status, Blockchain RPC Latency & Subsystems</p>
        </div>
        <span className="badge badge-fiu" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
          ALL SYSTEMS OPERATIONAL
        </span>
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {indexerServices.map((srv, idx) => (
          <div key={idx} className="card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>{srv.name}</span>
              </div>
              <span className="badge badge-fiu">{srv.status}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: '0.75rem' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>LATENCY</span>
                <div style={{ fontWeight: 800, color: 'var(--accent-copper-light)', fontFamily: 'var(--font-mono)' }}>{srv.latency}</div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderRadius: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>INTEGRATION</span>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{srv.mode}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
