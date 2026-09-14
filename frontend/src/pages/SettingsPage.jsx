import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { errorMessage } from '../contracts';

export default function SettingsPage() {
  const { user } = useAuth();
  const [configuration, setConfiguration] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (user?.role !== 'admin') return;
    api.get('/api/v1/admin/settings').then(response => setConfiguration(response.data)).catch(error => setMessage(errorMessage(error, 'Settings are unavailable.')));
  }, [user]);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800 }}>
    <div className="page-header" style={{ margin: 0 }}><div><h1>⚙️ Settings</h1><p className="subtitle">Profile defaults and configuration-safe provider status</p></div></div>
    <div className="panel" style={{ margin: 0 }}><div className="panel-header"><h3>Current Profile</h3></div><div className="panel-body"><p>{user?.full_name}</p><p>{user?.email}</p><p>Role: {user?.role}</p><p>Police station: {user?.police_station || 'Not configured'}</p></div></div>
    {user?.role !== 'admin' && <div className="card" style={{ padding: 16 }}>Provider and policy settings are restricted to administrators. Credentials are never stored in the browser.</div>}
    {message && <div className="card" style={{ padding: 12 }}>{message}</div>}
    {configuration && <div className="panel" style={{ margin: 0 }}><div className="panel-header"><h3>Provider Configuration</h3></div><div className="panel-body">{Object.entries(configuration.providers || {}).map(([provider, status]) => <div key={provider} style={{ display: 'flex', justifyContent: 'space-between', padding: 8 }}><span>{provider}</span><span className="badge badge-info">{status}</span></div>)}<p style={{ marginTop: 12 }}>Secrets exposed: {configuration.secrets_exposed ? 'Unexpected' : 'No'}</p></div></div>}
  </div>;
}
