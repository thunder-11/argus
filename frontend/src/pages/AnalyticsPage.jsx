import { useState, useEffect } from 'react';
import api from '../api';
import { errorMessage } from '../contracts';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/v1/dashboard/stats');
        setStats(res.data);
      } catch (err) {
        setError(errorMessage(err, 'Analytics are unavailable.'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner"></div><p>Calculating Forensic Analytics Models...</p></div>;
  }

  if (!stats) return <div className="card" style={{ padding: 24 }}>{error}</div>;

  const blockchainVolumes = Object.entries(stats.cases_by_chain || {}).map(([chain, count]) => ({ chain, count }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>📈 Forensic Analytics & Typology Trends</h1>
          <p className="subtitle">High-Level Aggregations, Blockchain Inflow Volume & Attribution Success Rates</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="stats-grid" style={{ margin: 0 }}>
        <div className="stat-card blue">
          <div className="stat-label">Total Traced Loss</div>
          <div className="stat-value">₹{(stats.total_loss_tracked || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Attribution Rate</div>
          <div className="stat-value">
            {stats.total_cases > 0 ? `${Math.round((stats.total_attributed / stats.total_cases) * 100)}%` : 'Not available'}
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Unique Wallets Traced</div>
          <div className="stat-value">{stats.total_wallets_traced ?? 0}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Syndicate Intersections</div>
          <div className="stat-value">{stats.total_syndicate_flags ?? 0}</div>
        </div>
      </div>

      {/* Two Column Visualizations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Blockchain Share Bars */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>🌐 Fraud Volume by Blockchain</h3>
          </div>
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {blockchainVolumes.map(b => <div key={b.chain}>{b.chain}: <strong>{b.count}</strong></div>)}
            {!blockchainVolumes.length && <div>Chain-denominated volumes are not supplied by the current API. No sample fallback is shown.</div>}
          </div>
        </div>

        {/* Risk Distribution */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>⚡ Risk Tier Classification</h3>
          </div>
          <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 14, background: 'rgba(189, 74, 74, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-crimson)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-crimson)' }}>CRITICAL RISK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#E57373', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {stats.cases_by_risk_tier?.CRITICAL ?? 0}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Mixers & Syndicate Overlaps</div>
            </div>

            <div style={{ padding: 14, background: 'rgba(217, 148, 59, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(217, 148, 59, 0.4)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-amber)' }}>HIGH RISK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#F0A742', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {stats.cases_by_risk_tier?.HIGH ?? 0}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Peeling Chains & Layering</div>
            </div>

            <div style={{ padding: 14, background: 'rgba(212, 163, 89, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-gold)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-gold)' }}>MEDIUM RISK</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-gold)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {stats.cases_by_risk_tier?.MEDIUM ?? 0}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Phishing & Unknown Clusters</div>
            </div>

            <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)' }}>RESOLVED / LOW</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                {stats.cases_by_risk_tier?.LOW ?? 0}
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>Compliant Verified Exchanges</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
