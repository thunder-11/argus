import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import api from '../api';
import { collection, errorMessage } from '../contracts';

const TYPOLOGY_LABELS = {
  TASK_BASED_SCAM: '📱 Task-Based Scam',
  INVESTMENT_PONZI_SCAM: '📈 Investment Ponzi',
  DIGITAL_ARREST_EXTORTION: '🚔 Digital Arrest',
  SEXTORTION_BLACKMAIL: '📸 Sextortion',
  RANSOMWARE_PAYMENT: '🔒 Ransomware',
  PHISHING_DRAINER: '🎣 Phishing Drainer',
  DARKNET_FINANCIAL_CRIME: '🕸️ Darknet Crime',
};

export default function OverviewPage() {
  const [stats, setStats] = useState(null);
  const [recentCases, setRecentCases] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { selectCase } = useCase();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchOverviewData = async () => {
      try {
        const [statsRes, casesRes, alertsRes] = await Promise.all([
          api.get('/api/v1/dashboard/stats'),
          api.get('/api/v1/cases'),
          api.get('/api/v1/alerts').catch(() => ({ data: { alerts: [] } })),
        ]);
        setStats(statsRes.data);
        setRecentCases(collection(casesRes.data, 'cases').slice(0, 5));
        setAlerts(collection(alertsRes.data, 'alerts').slice(0, 5));
      } catch (err) {
        setError(errorMessage(err, 'Overview data is unavailable.'));
      } finally {
        setLoading(false);
      }
    };
    fetchOverviewData();
  }, []);

  const handleOpenCase = (caseId) => {
    selectCase(caseId);
    navigate(`/money-trail?case=${caseId}`);
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner"></div><p>Aggregating Intelligence Telemetry...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overview Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>📊 Intelligence Command Center</h1>
          <p className="subtitle">Real-Time Cryptocurrency Fraud Attribution & Asset Recovery OS</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/cases')}>
            📁 Case Registry
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/money-trail')}>
            💸 Launch Money Trail
          </button>
        </div>
      </div>
      {error && <div className="card" style={{ padding: 12, color: 'var(--accent-amber)' }}>{error}</div>}

      {/* Stats KPI Grid */}
      {stats && (
        <div className="stats-grid" style={{ margin: 0 }}>
          <div className="stat-card blue">
            <div className="stat-label">Active Investigations</div>
            <div className="stat-value">{stats.total_cases}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Attributed VASPs</div>
            <div className="stat-value">{stats.total_attributed}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Syndicate Patterns</div>
            <div className="stat-value">{stats.total_syndicate_flags}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Tracked Fraud Loss</div>
            <div className="stat-value">₹{(stats.total_loss_tracked || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Two Column Grid: Live Stream + Active Investigations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
        {/* Left: Active Investigations & Typology */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Case Registry Preview */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-header">
              <h3>📁 Active Priority Cases ({recentCases.length})</h3>
              <button className="btn btn-outline" onClick={() => navigate('/cases')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                View All Cases →
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Typology</th>
                    <th>Reported Loss</th>
                    <th>Risk Tier</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCases.map(c => (
                    <tr key={c.id}>
                      <td className="mono" style={{ fontWeight: 800, color: 'var(--accent-copper-light)' }}>
                        {c.external_complaint_id}
                      </td>
                      <td style={{ fontSize: '0.8rem' }}>{TYPOLOGY_LABELS[c.fraud_typology] || c.fraud_typology}</td>
                      <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        ${c.reported_loss_amount?.toLocaleString()} {c.loss_currency}
                      </td>
                      <td>
                        <span className={`badge ${c.risk_tier === 'CRITICAL' ? 'badge-critical' : c.risk_tier === 'HIGH' ? 'badge-high' : 'badge-medium'}`}>
                          {c.risk_tier} ({c.risk_score})
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.status === 'ATTRIBUTED' ? 'badge-fiu' : 'badge-info'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-outline"
                          onClick={() => handleOpenCase(c.id)}
                          style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                        >
                          Investigate →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Typology Breakdown */}
          {stats?.cases_by_fraud_type && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3>📈 Fraud Typology Distribution</h3>
              </div>
              <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {Object.entries(stats.cases_by_fraud_type).map(([type, count]) => (
                  <div key={type} style={{
                    padding: '12px 14px', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                  }}>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {TYPOLOGY_LABELS[type] || type}
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                      {count} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>cases</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Activity Stream & Intelligence Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Live Activity Stream */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status-dot pulse" style={{ background: 'var(--accent-copper)' }}></span>
                <h3>Live Investigation Stream</h3>
              </div>
              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>REAL-TIME FEED</span>
            </div>
            <div className="panel-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(item => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 12px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                    {item.created_at?.substring(11, 19) || '—'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {item.title}
                    </div>
                  </div>
                  <span className={`badge ${item.severity === 'CRITICAL' ? 'badge-critical' : 'badge-info'}`} style={{ fontSize: '0.65rem' }}>
                    {item.alert_type || 'ALERT'}
                  </span>
                </div>
              ))}
              {!alerts.length && <div style={{ color: 'var(--text-muted)' }}>No durable activity alerts are available.</div>}
            </div>
          </div>

          {/* High Priority Alerts */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="panel-header">
              <h3>🚨 Priority Intelligence Dispatches</h3>
              <button className="btn btn-outline" onClick={() => navigate('/alerts')} style={{ padding: '3px 8px', fontSize: '0.75rem' }}>
                All Alerts →
              </button>
            </div>
            <div className="panel-body" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alerts.map(a => (
                <div
                  key={a.id}
                  onClick={() => a.case_id && handleOpenCase(a.case_id)}
                  style={{
                    padding: '10px 12px', background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                    cursor: a.case_id ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>{a.title}</span>
                    <span className={`badge ${a.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>{a.severity}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.message?.substring(0, 90)}...</div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  No unacknowledged high-severity alerts.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
