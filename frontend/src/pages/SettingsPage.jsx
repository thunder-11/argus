import { useState } from 'react';

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    etherscanKey: '••••••••••••••••••••',
    tronGridKey: '••••••••••••••••••••',
    bscScanKey: '••••••••••••••••••••',
    maxHopLimit: 6,
    minAmountFilter: 50.0,
    peelingThreshold: 80,
    policeStation: 'Cyber Crime Police Station, Bengaluru Central',
    courtName: 'City Civil & Sessions Court, Bengaluru',
  });

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>⚙️ System Settings & Forensic Thresholds</h1>
          <p className="subtitle">API Key Integrations, Heuristic Parameters & Statutory LEA Defaults</p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Section 1: API Keys */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>🔑 Blockchain Explorer API Keys</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>ETHERSCAN API KEY (ETHEREUM ERC-20)</label>
              <input
                className="form-input mono"
                value={settings.etherscanKey}
                onChange={e => setSettings({ ...settings, etherscanKey: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>TRONGRID API KEY (TRON TRC-20)</label>
              <input
                className="form-input mono"
                value={settings.tronGridKey}
                onChange={e => setSettings({ ...settings, tronGridKey: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>BSCSCAN API KEY (BNB SMART CHAIN BEP-20)</label>
              <input
                className="form-input mono"
                value={settings.bscScanKey}
                onChange={e => setSettings({ ...settings, bscScanKey: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Heuristics */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>⚡ Value-Weighted BFS Parameters</h3>
          </div>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>DEFAULT MAX HOP DEPTH</label>
              <input
                className="form-input mono"
                type="number"
                value={settings.maxHopLimit}
                onChange={e => setSettings({ ...settings, maxHopLimit: parseInt(e.target.value) })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>MIN TRANSFER VALUE FILTER (USD)</label>
              <input
                className="form-input mono"
                type="number"
                value={settings.minAmountFilter}
                onChange={e => setSettings({ ...settings, minAmountFilter: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Statutory Defaults */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>⚖️ Statutory Notice & Court Report Defaults</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>DEFAULT POLICE STATION CODE</label>
              <input
                className="form-input"
                value={settings.policeStation}
                onChange={e => setSettings({ ...settings, policeStation: e.target.value })}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>DESIGNATED SESSIONS COURT</label>
              <input
                className="form-input"
                value={settings.courtName}
                onChange={e => setSettings({ ...settings, courtName: e.target.value })}
              />
            </div>
          </div>
        </div>

        {saved && (
          <div style={{ padding: '10px 14px', background: 'rgba(92, 156, 118, 0.15)', color: '#7BC497', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(92, 156, 118, 0.35)', fontWeight: 800 }}>
            ✅ Settings and API key credentials updated successfully!
          </div>
        )}

        <button className="btn btn-primary btn-lg" type="submit">
          💾 Save Configuration
        </button>
      </form>
    </div>
  );
}
