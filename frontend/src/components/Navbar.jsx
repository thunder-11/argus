import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await api.get('/api/v1/alerts');
        setUnread(res.data.unread_count);
        setAlerts(res.data.alerts.slice(0, 5));
      } catch { /* ignore */ }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <div className="logo-icon">🔗</div>
        <div>
          <div className="brand-text">CFAS FORENSICS</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.6px' }}>
            CRYPTO ATTRIBUTION & INTELLIGENCE
          </div>
        </div>
      </NavLink>

      <ul className="navbar-nav">
        <li><NavLink to="/" end>📊 Intelligence Dashboard</NavLink></li>
        <li><NavLink to="/trace">🔍 New Trace</NavLink></li>
        {(user?.role === 'admin' || user?.role === 'analyst') && (
          <li><NavLink to="/vasp">🏦 VASP Directory</NavLink></li>
        )}
      </ul>

      <div className="navbar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.725rem', color: '#E5B869', background: 'rgba(212, 163, 89, 0.12)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 163, 89, 0.3)', fontWeight: 800 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D4A359', display: 'inline-block' }}></span>
          STREAM ACTIVE
        </div>

        <div style={{ position: 'relative' }}>
          <button className="alert-bell" onClick={() => setShowAlerts(!showAlerts)}>
            🔔
            {unread > 0 && <span className="badge">{unread}</span>}
          </button>

          {showAlerts && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, width: 380,
              background: 'var(--bg-card)', border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
              zIndex: 999, marginTop: 8, maxHeight: 400, overflowY: 'auto',
              color: 'var(--text-primary)'
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', fontWeight: 800, fontSize: '0.825rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                System Alerts ({unread} unread)
              </div>
              {alerts.map(a => (
                <div key={a.id} style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                  background: a.is_read ? 'transparent' : 'rgba(200, 109, 59, 0.08)',
                  cursor: 'pointer'
                }} onClick={async () => {
                  try { await api.put(`/api/v1/alerts/${a.id}/read`); } catch { }
                  if (a.case_id) navigate(`/case/${a.case_id}`);
                  setShowAlerts(false);
                }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 800, marginBottom: 3, color: 'var(--text-primary)' }}>{a.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{a.message?.substring(0, 100)}...</div>
                </div>
              ))}
              {alerts.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No alerts</div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{user?.full_name}</span>
          <span className="badge badge-info">{user?.role}</span>
        </div>
        <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '5px 11px', fontSize: '0.775rem' }}>Logout</button>
      </div>
    </nav>
  );
}
