import { useState, useEffect } from 'react';
import api from '../api';

export default function EntitiesPage() {
  const [vasps, setVasps] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntities();
  }, []);

  const fetchEntities = async () => {
    try {
      const [vaspRes, addrRes] = await Promise.all([
        api.get('/api/v1/vasp/directory'),
        api.get('/api/v1/vasp/addresses'),
      ]);
      setVasps(vaspRes.data.vasps || []);
      setAddresses(addrRes.data.addresses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVasps = activeTypeFilter === 'ALL'
    ? vasps
    : activeTypeFilter === 'FIU'
    ? vasps.filter(v => v.is_fiu_ind_registered)
    : vasps.filter(v => !v.is_fiu_ind_registered);

  if (loading) {
    return <div className="loading-overlay"><div className="spinner"></div><p>Loading Entity Directory...</p></div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>🏦 Entity & VASP Intelligence Directory</h1>
          <p className="subtitle">FIU-IND Registered VASPs, Global Exchanges, Mixers & Bridge Protocols</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>FILTER:</span>
          {['ALL', 'FIU', 'GLOBAL'].map(f => (
            <button
              key={f}
              onClick={() => setActiveTypeFilter(f)}
              className={`btn ${activeTypeFilter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            >
              {f === 'FIU' ? '🇮🇳 FIU-IND Registered' : f === 'GLOBAL' ? '🌐 Global Exchanges' : 'All Entities'}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{filteredVasps.length}</strong> Registered VASPs • <strong>{addresses.length}</strong> Address Clusters
        </div>
      </div>

      {/* Directory Table */}
      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <h3>VASP & Exchange Directory</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Exchange / Entity</th>
                <th>Legal Entity Name</th>
                <th>FIU-IND Status</th>
                <th>Jurisdiction</th>
                <th>Compliance Nodal Officer Email</th>
                <th>Statutory SLA</th>
                <th>Known Clusters</th>
              </tr>
            </thead>
            <tbody>
              {filteredVasps.map(v => (
                <tr
                  key={v.id}
                  onClick={() => setSelectedEntity(v.id === selectedEntity ? null : v.id)}
                  style={{ cursor: 'pointer', background: selectedEntity === v.id ? 'rgba(200, 109, 59, 0.08)' : 'transparent' }}
                >
                  <td style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{v.vasp_name}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.legal_entity_name || '—'}</td>
                  <td>
                    {v.is_fiu_ind_registered
                      ? <span className="badge badge-fiu">🇮🇳 FIU REGISTERED</span>
                      : <span className="badge badge-low">NON-REGISTERED</span>}
                  </td>
                  <td>{v.jurisdiction}</td>
                  <td className="mono" style={{ color: 'var(--accent-copper-light)' }}>{v.nodal_officer_email}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                    {v.sla_freeze_hours ? `${v.sla_freeze_hours} hrs` : '—'}
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

      {/* Known Address Clusters for Selected VASP */}
      {selectedEntity && (
        <div className="panel" style={{ margin: 0 }}>
          <div className="panel-header">
            <h3>Known Deposit & Hot Wallet Clusters for {vasps.find(v => v.id === selectedEntity)?.vasp_name}</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Chain</th>
                  <th>Cluster Tag</th>
                  <th>Verification Level</th>
                </tr>
              </thead>
              <tbody>
                {addresses.filter(a => a.vasp_id === selectedEntity).map(a => (
                  <tr key={a.address + a.chain}>
                    <td className="mono" style={{ color: 'var(--accent-copper-light)' }}>{a.address}</td>
                    <td><span className="badge badge-info">{a.chain}</span></td>
                    <td>{a.address_tag}</td>
                    <td>
                      {a.is_verified
                        ? <span style={{ color: '#7BC497', fontWeight: 800 }}>✓ Verified Deposit</span>
                        : <span style={{ color: 'var(--text-muted)' }}>Heuristic Cluster</span>}
                    </td>
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
