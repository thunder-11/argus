import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import api from '../api';

export default function WalletIntelligencePage() {
  const [searchParams] = useSearchParams();
  const addressFromUrl = searchParams.get('address');
  const chainFromUrl = searchParams.get('chain');

  const [address, setAddress] = useState(addressFromUrl || 'TDEMO_MULE_LAYER_001');
  const [chain, setChain] = useState(chainFromUrl || 'TRON');
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { selectCase } = useCase();
  const navigate = useNavigate();

  useEffect(() => {
    if (addressFromUrl) {
      setAddress(addressFromUrl);
      if (chainFromUrl) setChain(chainFromUrl);
      inspectWallet(addressFromUrl, chainFromUrl || 'TRON');
    } else {
      inspectWallet('TDEMO_MULE_LAYER_001', 'TRON');
    }
  }, [addressFromUrl, chainFromUrl]);

  const inspectWallet = (addr, ch) => {
    setLoading(true);
    // Simulate real-time forensic wallet dossier computation
    setTimeout(() => {
      const isMixer = addr.includes('MIXER');
      const isVasp = addr.includes('COINDCX') || addr.includes('WAZIRX') || addr.includes('BINANCE');
      const isBridge = addr.includes('BRIDGE');

      setWalletData({
        address: addr,
        chain: ch,
        riskScore: isMixer ? 95 : isVasp ? 15 : 78,
        riskTier: isMixer ? 'CRITICAL' : isVasp ? 'LOW' : 'HIGH',
        entityType: isMixer ? 'PRIVACY_MIXER_CONTRACT' : isVasp ? 'VASP_DEPOSIT_CLUSTER' : isBridge ? 'CROSS_CHAIN_BRIDGE' : 'INTERMEDIARY_MULE',
        totalReceived: isVasp ? 1250000 : 12500,
        totalSent: isVasp ? 1240000 : 11800,
        txCount: isVasp ? 1420 : 6,
        firstSeen: '2026-08-20 14:10:00 UTC',
        lastActive: '2026-08-27 18:45:00 UTC',
        counterparties: [
          { addr: 'TDEMO_VICTIM_WALLET_001', type: 'ORIGIN_VICTIM', amount: 12500, tx: 'DEMO_TX_001' },
          { addr: 'TDEMO_MIXER_CONTRACT', type: 'MIXER', amount: 11800, tx: 'DEMO_TX_002' },
          { addr: 'TDEMO_SHARED_MULE_SYN', type: 'MULE_LAYER', amount: 700, tx: 'DEMO_TX_002B' },
        ]
      });
      setLoading(false);
    }, 200);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (address.trim()) inspectWallet(address.trim(), chain);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>🔎 Wallet & Contract Intelligence Dossier</h1>
          <p className="subtitle">On-Chain Forensic Profiler, Clustering & Risk Analytics</p>
        </div>
      </div>

      {/* Address Search Bar */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              className="form-input mono"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Enter suspect wallet address (e.g. T..., 0x..., bc1...)"
              style={{ fontSize: '0.9rem', fontWeight: 600 }}
            />
          </div>
          <select
            className="form-select"
            value={chain}
            onChange={e => setChain(e.target.value)}
            style={{ width: 170 }}
          >
            <option value="TRON">TRON (TRC-20)</option>
            <option value="ETH">Ethereum (ERC-20)</option>
            <option value="BSC">BSC (BEP-20)</option>
            <option value="BTC">Bitcoin</option>
          </select>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳ Analyzing...' : '🔍 Inspect Wallet'}
          </button>
        </form>
      </div>

      {/* Wallet Dossier Display */}
      {walletData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Left Column: Wallet Overview & Counterparty Activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* KPI Stats */}
            <div className="stats-grid" style={{ margin: 0, gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="stat-card blue">
                <div className="stat-label">Total Inflow</div>
                <div className="stat-value">${walletData.totalReceived.toLocaleString()}</div>
              </div>
              <div className="stat-card amber">
                <div className="stat-label">Total Outflow</div>
                <div className="stat-value">${walletData.totalSent.toLocaleString()}</div>
              </div>
              <div className="stat-card green">
                <div className="stat-label">Recorded Transactions</div>
                <div className="stat-value">{walletData.txCount}</div>
              </div>
            </div>

            {/* Counterparties Table */}
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3>🔗 Direct Counterparty Connections</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Counterparty Address</th>
                      <th>Entity Type</th>
                      <th>Volume</th>
                      <th>Tx Reference</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {walletData.counterparties.map((cp, i) => (
                      <tr key={i}>
                        <td className="mono" style={{ color: 'var(--accent-copper-light)' }}>
                          {cp.addr}
                        </td>
                        <td>
                          <span className={`badge ${cp.type === 'MIXER' ? 'badge-critical' : cp.type === 'VASP' ? 'badge-fiu' : 'badge-info'}`}>
                            {cp.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          ${cp.amount.toLocaleString()} USDT
                        </td>
                        <td className="mono">{cp.tx}</td>
                        <td>
                          <button
                            className="btn btn-outline"
                            onClick={() => inspectWallet(cp.addr, walletData.chain)}
                            style={{ padding: '2px 7px', fontSize: '0.7rem' }}
                          >
                            Inspect →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Risk & Forensic Classification */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Risk Gauge */}
            <div className="intel-panel">
              <div className="intel-panel-header">
                <h4>⚡ Risk & Entity Classification</h4>
              </div>
              <div className="intel-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className={`risk-gauge ${walletData.riskTier.toLowerCase()}`}>
                  <div className="gauge-value">{walletData.riskScore}</div>
                  <div className="gauge-label">/ 100 — {walletData.riskTier} RISK</div>
                </div>

                <div className="dossier-grid">
                  <div className="dossier-card">
                    <div className="dossier-label">CLASSIFICATION</div>
                    <div className="dossier-val" style={{ color: 'var(--accent-copper-light)' }}>
                      {walletData.entityType}
                    </div>
                  </div>
                  <div className="dossier-card">
                    <div className="dossier-label">CHAIN</div>
                    <div className="dossier-val">{walletData.chain}</div>
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/money-trail?wallet=${walletData.address}`)}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                >
                  🚀 Trace Outgoing Fund Flow →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
