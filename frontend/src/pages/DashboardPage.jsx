import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const TYPOLOGY_LABELS = {
  TASK_BASED_SCAM: '📱 Task-Based Scam',
  INVESTMENT_PONZI_SCAM: '📈 Investment Ponzi',
  DIGITAL_ARREST_EXTORTION: '🚔 Digital Arrest',
  SEXTORTION_BLACKMAIL: '📸 Sextortion',
  RANSOMWARE_PAYMENT: '🔒 Ransomware',
  PHISHING_DRAINER: '🎣 Phishing Drainer',
  DARKNET_FINANCIAL_CRIME: '🕸️ Darknet Crime',
};

const RISK_CLASSES = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

export default function DashboardPage() {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesRes, statsRes] = await Promise.all([
          api.get('/api/v1/cases'),
          api.get('/api/v1/dashboard/stats'),
        ]);
        setCases(casesRes.data.cases);
        setStats(statsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner"></div><p>Loading intelligence dashboard...</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>📊 Operations Dashboard</h1>
          <p className="subtitle">Cyber Fraud Attribution Intelligence Center</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/trace')}>
          🔍 New Trace
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-label">Total Cases</div>
            <div className="stat-value">{stats.total_cases}</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">VASP Attributed</div>
            <div className="stat-value">{stats.total_attributed}</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Syndicate Flags</div>
            <div className="stat-value">{stats.total_syndicate_flags}</div>
          </div>
          <div className="stat-card amber">
            <div className="stat-label">Total Loss Tracked</div>
            <div className="stat-value">₹{(stats.total_loss_tracked || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Fraud Type Distribution */}
      {stats?.cases_by_fraud_type && Object.keys(stats.cases_by_fraud_type).length > 0 && (
        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-header"><h3>Cases by Fraud Typology</h3></div>
          <div className="panel-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(stats.cases_by_fraud_type).map(([type, count]) => (
              <div key={type} style={{
                padding: '12px 18px', background: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)',
                minWidth: 160
              }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{TYPOLOGY_LABELS[type] || type}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cases Grid */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.1rem' }}>Active Cases ({cases.length})</h2>
      </div>

      <div className="cases-grid">
        {cases.map(c => (
          <div key={c.id} className="card case-card" onClick={() => navigate(`/case/${c.id}`)}>
            <div className="case-header">
              <span className="case-id">{c.external_complaint_id}</span>
              <span className={`badge ${RISK_CLASSES[c.risk_tier] || 'badge-low'}`}>
                {c.risk_tier} ({c.risk_score})
              </span>
            </div>
            <div className="case-type">{TYPOLOGY_LABELS[c.fraud_typology] || c.fraud_typology}</div>
            <div className="case-amount">
              {c.reported_loss_amount.toLocaleString()} {c.loss_currency}
            </div>
            <div className="case-meta">
              <span className={`badge ${c.status === 'ATTRIBUTED' ? 'badge-success' : c.status === 'NEW' ? 'badge-info' : 'badge-medium'}`}>
                {c.status}
              </span>
              {c.possible_syndicate && <span className="badge badge-critical">🚨 SYNDICATE</span>}
              <span>{c.complaint_source}</span>
            </div>
          </div>
        ))}
      </div>

      {cases.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '1.2rem', marginBottom: 8 }}>No cases yet</p>
          <p>Start by creating a new trace or simulating an NCRP complaint</p>
        </div>
      )}
    </div>
  );
}
