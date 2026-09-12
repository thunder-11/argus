import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
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

export default function CasesPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const { selectCase } = useCase();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const res = await api.get('/api/v1/cases');
      setCases(res.data.cases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCase = (cId, mode = 'money_trail') => {
    selectCase(cId);
    if (mode === 'graph') {
      navigate(`/graph?case=${cId}`);
    } else {
      navigate(`/money-trail?case=${cId}`);
    }
  };

  const filteredCases = cases.filter(c => {
    const matchesSearch =
      c.external_complaint_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.victim_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fraud_typology?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
    const matchesRisk = selectedRisk === 'ALL' || c.risk_tier === selectedRisk;

    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>📁 Case Investigation Registry</h1>
          <p className="subtitle">Official LEA Cyber Fraud Intake & Attribution Registry</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/trace')}>
          ⚡ New Complaint Intake / Trace
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
          <span style={{ color: 'var(--text-muted)' }}>🔍</span>
          <input
            className="form-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter by Case ID, Victim Name, or Typology..."
            style={{ padding: '7px 12px', fontSize: '0.85rem' }}
          />
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>STATUS:</span>
            {['ALL', 'ATTRIBUTED', 'UNDER_INVESTIGATION', 'NEW'].map(st => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`btn ${selectedStatus === st ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Risk Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>RISK:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(rk => (
              <button
                key={rk}
                onClick={() => setSelectedRisk(rk)}
                className={`btn ${selectedRisk === rk ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '3px 8px', fontSize: '0.7rem' }}
              >
                {rk}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cases Registry Table */}
      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <h3>Active Registered Cases ({filteredCases.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Complaint ID</th>
                <th>Typology</th>
                <th>Reported Loss</th>
                <th>Intake Source</th>
                <th>Risk Score</th>
                <th>Status</th>
                <th>Syndicate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id}>
                  <td className="mono" style={{ fontWeight: 800, color: 'var(--accent-copper-light)' }}>
                    {c.external_complaint_id}
                  </td>
                  <td style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                    {TYPOLOGY_LABELS[c.fraud_typology] || c.fraud_typology}
                  </td>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    ${c.reported_loss_amount?.toLocaleString()} {c.loss_currency}
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {c.complaint_source?.toUpperCase()}
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
                    {c.possible_syndicate ? (
                      <span className="badge badge-critical">🚨 SYNDICATE</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleOpenCase(c.id, 'money_trail')}
                        style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                      >
                        💸 Trail
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleOpenCase(c.id, 'graph')}
                        style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                      >
                        🕸️ Graph
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
