import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email) => {
    setEmail(email);
    setPassword('cfas2026');
    setLoading(true);
    try {
      await login(email, 'cfas2026');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 54, height: 54, margin: '0 auto 16px',
            background: 'var(--bg-secondary)', border: '1px solid var(--border-copper)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: 'var(--shadow-glow-copper)', color: 'var(--accent-copper)'
          }}>🔗</div>
        </div>
        <h1>CFAS FORENSICS</h1>
        <p className="subtitle">Crypto Fraud Attribution System<br />Forensic Intelligence Console for Law Enforcement</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Authorized Gov Email</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="officer@cyberpolice.gov.in" required />
          </div>
          <div className="form-group">
            <label>Security Key</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p className="form-error" style={{ marginBottom: 12 }}>⚠️ {error}</p>}
          <button className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? '⏳ Authenticating Credentials...' : '🔐 Secure LEA Access'}
          </button>
        </form>

        <div style={{ marginTop: 24, borderTop: '1px solid var(--border-default)', paddingTop: 16 }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.6px', marginBottom: 10, textAlign: 'center' }}>QUICK ROLE ACCESS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={() => quickLogin('inspector.sharma@cyberpolice.gov.in')}>
              👮 Inspector Sharma (Investigator)
            </button>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={() => quickLogin('analyst.mehra@i4c.gov.in')}>
              🔬 Analyst Mehra (Senior Analyst)
            </button>
            <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
              onClick={() => quickLogin('admin@cfas.gov.in')}>
              🛡️ Superintendent Verma (Command Admin)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
