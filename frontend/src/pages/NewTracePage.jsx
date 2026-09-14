import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { errorMessage } from '../contracts';

const DEMO_ENABLED = import.meta.env.VITE_DEMO_ENABLED === 'true';

export default function NewTracePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('manual'); // 'manual' or 'complaint'
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Complaint form state
  const [complaint, setComplaint] = useState({
    complaint_source: 'ncrp',
    external_complaint_id: '',
    victim_name: '',
    victim_phone: '',
    fraud_typology: 'TASK_BASED_SCAM',
    reported_loss_amount: '',
    loss_currency: 'USDT',
    complaint_text: '',
    victim_reported_at: '',
    receipt_reference: '',
  });

  const autoDetectChain = (addr) => {
    if (/^T[a-zA-Z0-9]{33}$/.test(addr)) return 'TRON';
    if (/^0x[a-fA-F0-9]{40}$/.test(addr)) return 'ETH';
    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/.test(addr)) return 'BTC';
    return '';
  };

  const handleAddressChange = (val) => {
    setAddress(val);
    const detected = autoDetectChain(val);
    if (detected) setChain(detected);
  };

  const handleManualTrace = async () => {
    if (!address) { setError('Please enter a wallet address'); return; }
    setError('');
    setLoading(true);

    try {
      await api.post('/api/v1/wallets/validate', { address, chain: chain || null });
      const complaintRes = await api.post('/api/v1/complaints', {
        complaint_source: 'manual_fir',
        external_complaint_id: `MANUAL-${crypto.randomUUID()}`,
        fraud_typology: 'TASK_BASED_SCAM',
        reported_loss_amount: 0,
        suspect_wallets: [{ address, chain: chain || null }],
        auto_start: true,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      const caseId = complaintRes.data.case_id;
      navigate(`/case/${caseId}?case=${caseId}`);
    } catch (err) {
      setError(errorMessage(err, 'Trace failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintSubmit = async () => {
    if (!address) { setError('Please enter a suspect wallet address'); return; }
    setError('');
    setLoading(true);

    try {
      if (!complaint.external_complaint_id.trim()) throw new Error('Complaint ID is required');
      await api.post('/api/v1/wallets/validate', { address, chain: chain || null });
      const res = await api.post('/api/v1/complaints', {
        ...complaint,
        reported_loss_amount: parseFloat(complaint.reported_loss_amount) || 0,
        victim_reported_at: complaint.victim_reported_at || null,
        receipt_reference: complaint.receipt_reference || null,
        suspect_wallets: [{ address, chain: chain || null, token_symbol: complaint.loss_currency }],
        data_mode: DEMO_ENABLED ? 'fixture' : 'live',
        auto_start: true,
      }, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
      const caseId = res.data.case_id;
      navigate(`/case/${caseId}?case=${caseId}`);
    } catch (err) {
      setError(errorMessage(err, 'Submission failed'));
    } finally {
      setLoading(false);
    }
  };

  const loadDemoCase = () => {
    setAddress('TDEMO_VICTIM_WALLET_001');
    setChain('TRON');
    setComplaint({
      ...complaint,
      external_complaint_id: `NCRP-DEMO-${crypto.randomUUID()}`,
      victim_name: 'Rajesh Kumar',
      victim_phone: '+91-9876543210',
      fraud_typology: 'TASK_BASED_SCAM',
      reported_loss_amount: '12500',
      loss_currency: 'USDT',
      complaint_text: 'Victim was lured via Telegram task-fraud app promising 30% daily returns for rating hotels on Google Maps. Transferred 12,500 USDT to suspect TRON wallet.',
      victim_reported_at: new Date().toISOString(),
      receipt_reference: 'SIMULATED-NCRP-RECEIPT',
    });
    setMode('complaint');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🔍 New Blockchain Trace</h1>
          <p className="subtitle">Enter a suspect wallet address to begin real-time attribution</p>
        </div>
        {DEMO_ENABLED && <button className="btn btn-success" onClick={loadDemoCase}>
          🎯 Load Demo Scenario
        </button>}
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button className={`btn ${mode === 'manual' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('manual')}>
          ⚡ Quick Trace
        </button>
        <button className={`btn ${mode === 'complaint' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMode('complaint')}>
          📋 NCRP / 1930 Complaint
        </button>
      </div>

      <div className="card" style={{ maxWidth: 700 }}>
        {/* Wallet Address Input */}
        <div className="form-group">
          <label>Suspect Wallet Address</label>
          <input className="form-input mono" value={address} onChange={e => handleAddressChange(e.target.value)}
            placeholder="T..., 0x..., bc1..., 1..., 3..." />
          {chain && <span style={{ fontSize: '0.775rem', color: 'var(--accent-copper-light)', marginTop: 6, display: 'inline-block', fontWeight: 800 }}>
            ✅ Detected Network: <span className="badge badge-info">{chain}</span>
          </span>}
        </div>

        <div>
          <div className="form-group">
            <label>Blockchain Network</label>
            <select className="form-select" value={chain} onChange={e => setChain(e.target.value)}>
              <option value="">Auto-detect</option>
              <option value="TRON">TRON (TRC-20)</option>
              <option value="ETH">Ethereum (ERC-20)</option>
              <option value="BSC">BSC (BEP-20)</option>
              <option value="BTC">Bitcoin</option>
              <option value="POLYGON">Polygon</option>
            </select>
          </div>
        </div>

        {/* Complaint Fields */}
        {mode === 'complaint' && (
          <>
            <div style={{ borderTop: '1px solid var(--border-default)', margin: '20px 0', paddingTop: 20 }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: 16, color: 'var(--accent-copper-light)' }}>
                📡 NCRP / 1930 Statutory Complaint Intake
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Complaint ID</label>
                <input className="form-input mono" value={complaint.external_complaint_id}
                  onChange={e => setComplaint({ ...complaint, external_complaint_id: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Fraud Typology</label>
                <select className="form-select" value={complaint.fraud_typology}
                  onChange={e => setComplaint({ ...complaint, fraud_typology: e.target.value })}>
                  <option value="TASK_BASED_SCAM">📱 Task-Based Scam</option>
                  <option value="INVESTMENT_PONZI_SCAM">📈 Investment Ponzi</option>
                  <option value="DIGITAL_ARREST_EXTORTION">🚔 Digital Arrest</option>
                  <option value="SEXTORTION_BLACKMAIL">📸 Sextortion</option>
                  <option value="RANSOMWARE_PAYMENT">🔒 Ransomware</option>
                  <option value="PHISHING_DRAINER">🎣 Phishing / Drainer</option>
                  <option value="DARKNET_FINANCIAL_CRIME">🕸️ Darknet Crime</option>
                </select>
              </div>
              <div className="form-group">
                <label>Victim Name</label>
                <input className="form-input" value={complaint.victim_name}
                  onChange={e => setComplaint({ ...complaint, victim_name: e.target.value })} placeholder="Rajesh Kumar" />
              </div>
              <div className="form-group">
                <label>Victim Phone</label>
                <input className="form-input" value={complaint.victim_phone}
                  onChange={e => setComplaint({ ...complaint, victim_phone: e.target.value })} placeholder="+91-9876543210" />
              </div>
              <div className="form-group">
                <label>Loss Amount</label>
                <input className="form-input mono" type="number" value={complaint.reported_loss_amount}
                  onChange={e => setComplaint({ ...complaint, reported_loss_amount: e.target.value })} placeholder="12500" />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <select className="form-select" value={complaint.loss_currency}
                  onChange={e => setComplaint({ ...complaint, loss_currency: e.target.value })}>
                  <option value="USDT">USDT</option>
                  <option value="INR">INR</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Complaint Narrative</label>
              <textarea className="form-textarea" value={complaint.complaint_text}
                onChange={e => setComplaint({ ...complaint, complaint_text: e.target.value })}
                placeholder="Describe how the fraud occurred..." rows={3} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label>Victim Report Receipt Time (ISO-8601 with offset)</label>
                <input className="form-input mono" value={complaint.victim_reported_at}
                  onChange={e => setComplaint({ ...complaint, victim_reported_at: e.target.value })}
                  placeholder="2026-09-13T10:15:00+05:30" />
              </div>
              <div className="form-group">
                <label>Receipt Reference</label>
                <input className="form-input mono" value={complaint.receipt_reference}
                  onChange={e => setComplaint({ ...complaint, receipt_reference: e.target.value })}
                  placeholder="NCRP receipt / diary reference" />
              </div>
            </div>
          </>
        )}

        {error && <p className="form-error" style={{ marginBottom: 12 }}>⚠️ {error}</p>}

        <button className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 8 }}
          onClick={mode === 'manual' ? handleManualTrace : handleComplaintSubmit} disabled={loading}>
          {loading ? '⏳ Executing Real-Time Trace...' : '🚀 Initiate Real-Time Attribution'}
        </button>
      </div>
    </div>
  );
}
