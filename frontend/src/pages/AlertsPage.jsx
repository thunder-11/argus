import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import api from '../api';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const { selectCase } = useCase();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/api/v1/alerts');
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAlertClick = async (alert) => {
    try {
      await api.put(`/api/v1/alerts/${alert.id}/read`);
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }

    if (alert.case_id) {
      selectCase(alert.case_id);
      navigate(`/money-trail?case=${alert.case_id}`);
    }
  };

  const filteredAlerts = severityFilter === 'ALL'
    ? alerts
    : alerts.filter(a => a.severity === severityFilter);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner"></div><p>Dispatching Intelligence Alerts...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>🚨 Risk & Alerts Intelligence Dispatch</h1>
          <p className="subtitle">Real-Time Syndicate Detections, Mixer Interceptions & VASP Attribution Alerts</p>
        </div>
      </div>

      {/* Severity Filter Toolbar */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>SEVERITY FILTER:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`btn ${severityFilter === sev ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            >
              {sev}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredAlerts.length}</strong> Alerts
        </div>
      </div>

      {/* Alerts Stream List */}
      <div style={{ display: 'grid', gap: 12 }}>
        {filteredAlerts.map(alert => (
          <div
            key={alert.id}
            onClick={() => handleAlertClick(alert)}
            className="card"
            style={{
              padding: '16px 20px',
              borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? 'var(--accent-crimson)' : alert.severity === 'HIGH' ? 'var(--accent-amber)' : 'var(--accent-gold)'}`,
              background: alert.is_read ? 'var(--bg-card)' : 'rgba(200, 109, 59, 0.08)',
              cursor: alert.case_id ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>{alert.severity === 'CRITICAL' ? '🚨' : '⚠️'}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {alert.title}
                </span>
                {!alert.is_read && (
                  <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>NEW UNREAD</span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className={`badge ${alert.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`}>
                  {alert.severity}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {alert.created_at ? alert.created_at.substring(0, 19).replace('T', ' ') : 'Just now'}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
              {alert.message}
            </p>

            {alert.case_id && (
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--accent-copper-light)', fontWeight: 700 }}>
                <span>Inspect linked case trail →</span>
              </div>
            )}
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No alerts found matching the selected severity filter.
          </div>
        )}
      </div>
    </div>
  );
}
