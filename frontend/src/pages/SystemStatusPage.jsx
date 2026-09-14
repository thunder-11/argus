import { useEffect, useState } from 'react';
import api from '../api';
import { errorMessage } from '../contracts';

export default function SystemStatusPage() {
  const [services, setServices] = useState([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    Promise.allSettled([api.get('/health/live'), api.get('/health/ready'), api.get('/api/v1/ml/models/status')]).then(results => {
      const names = ['API liveness', 'Required dependencies', 'New ML service'];
      setServices(results.map((result, index) => result.status === 'fulfilled'
        ? { name: names[index], status: result.value.data.status || result.value.data.service_state || 'available', details: result.value.data }
        : { name: names[index], status: result.reason?.response?.status === 403 ? 'restricted' : 'unavailable', details: null }));
    }).catch(error => setMessage(errorMessage(error, 'System status is unavailable.')));
  }, []);
  const ready = services.length > 0 && services.filter(item => item.status !== 'restricted').every(item => !['unavailable', 'not_ready'].includes(item.status));
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div className="page-header" style={{ margin: 0 }}><div><h1>System Health & Telemetry</h1><p className="subtitle">Measured backend readiness; no synthetic provider latency</p></div><span className={`badge ${ready ? 'badge-fiu' : 'badge-high'}`}>{ready ? 'AVAILABLE' : 'DEGRADED / UNKNOWN'}</span></div>
    {message && <div className="card" style={{ padding: 12 }}>{message}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>{services.map(service => <div key={service.name} className="card" style={{ padding: 18 }}><strong>{service.name}</strong><div style={{ marginTop: 8 }}><span className="badge badge-info">{String(service.status).toUpperCase()}</span></div>{service.details?.data_mode && <div style={{ marginTop: 8 }}>Data mode: {service.details.data_mode}</div>}</div>)}</div>
  </div>;
}
