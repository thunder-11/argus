import { useState, useEffect } from 'react';
import api from '../api';

export default function VaspDirectoryPage() {
  const [vasps, setVasps] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedVasp, setSelectedVasp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vaspRes, addrRes] = await Promise.all([
        api.get('/api/v1/vasp/directory'),
        api.get('/api/v1/vasp/addresses'),
      ]);
      setVasps(vaspRes.data.vasps);
      setAddresses(addrRes.data.addresses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>🏦 VASP & Exchange Intelligence Directory</h1>
          <p className="subtitle">{vasps.length} registered VASPs • {addresses.length} known addresses</p>
        </div>
      </div>

      {/* VASP Directory Table */}
      <div className="panel">
        <div className="panel-header"><h3>Exchange Directory</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exchange</th>
                <th>Legal Entity</th>
                <th>FIU-IND</th>
                <th>Jurisdiction</th>
                <th>Nodal Email</th>
                <th>SLA (hrs)</th>
                <th>Addresses</th>
              </tr>
            </thead>
            <tbody>
              {vasps.map(v => (
                <tr key={v.id} onClick={() => setSelectedVasp(v.id === selectedVasp ? null : v.id)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 700 }}>{v.vasp_name}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.legal_entity_name || '—'}</td>
                  <td>
                    {v.is_fiu_ind_registered
                      ? <span className="badge badge-fiu">🇮🇳 Registered</span>
                      : <span className="badge badge-low">No</span>}
                  </td>
                  <td>{v.jurisdiction}</td>
                  <td className="mono" style={{ fontSize: '0.75rem' }}>{v.nodal_officer_email}</td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {v.sla_freeze_hours || '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge badge-info">{v.address_count}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Known Addresses */}
      {selectedVasp && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-header">
            <h3>Known Addresses for {vasps.find(v => v.id === selectedVasp)?.vasp_name}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Chain</th>
                  <th>Tag</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                {addresses.filter(a => a.vasp_id === selectedVasp).map(a => (
                  <tr key={a.address + a.chain}>
                    <td className="mono" style={{ fontSize: '0.8rem', wordBreak: 'break-all' }}>{a.address}</td>
                    <td><span className="badge badge-info">{a.chain}</span></td>
                    <td>{a.address_tag}</td>
                    <td>{a.is_verified ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
