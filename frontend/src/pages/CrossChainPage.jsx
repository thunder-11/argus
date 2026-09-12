import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';

export default function CrossChainPage() {
  const { selectCase } = useCase();
  const navigate = useNavigate();

  const crossChainEvents = [
    {
      id: 'CC-EVT-001',
      caseId: 'case-demo-003',
      caseName: 'NCRP-2026-99312',
      sourceChain: 'TRON (TRC-20)',
      destChain: 'Ethereum (ERC-20)',
      bridgeProtocol: 'Portal Bridge / Wormhole',
      bridgeAddress: 'TDEMO_BRIDGE_CONTRACT',
      amount: 9700.0,
      token: 'USDT',
      timestamp: '2026-08-26 15:30:00 UTC',
      status: 'CONFIRMED_CROSS_CHAIN',
      confidence: 96,
    },
    {
      id: 'CC-EVT-002',
      caseId: 'case-demo-001',
      caseName: 'NCRP-2026-88421',
      sourceChain: 'TRON (TRC-20)',
      destChain: 'BNB Smart Chain (BEP-20)',
      bridgeProtocol: 'Stargate Finance',
      bridgeAddress: '0x296F...8821',
      amount: 11800.0,
      token: 'USDT',
      timestamp: '2026-08-27 12:15:00 UTC',
      status: 'CONFIRMED_CROSS_CHAIN',
      confidence: 94,
    },
    {
      id: 'CC-EVT-003',
      caseId: 'case-demo-005',
      caseName: 'FIR-MH-CYB-2026-0091',
      sourceChain: 'Ethereum (ERC-20)',
      destChain: 'Polygon POS',
      bridgeProtocol: 'Polygon PoS Bridge',
      bridgeAddress: '0xA0c6...5412',
      amount: 35000.0,
      token: 'USDT',
      timestamp: '2026-08-25 18:40:00 UTC',
      status: 'CONFIRMED_CROSS_CHAIN',
      confidence: 98,
    },
  ];

  const handleOpenCase = (cId) => {
    selectCase(cId);
    navigate(`/money-trail?case=${cId}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>⚡ Cross-Chain Intelligence & Bridge Lanes</h1>
          <p className="subtitle">Real-Time Detection of Cross-Chain Swaps, Inter-Blockchain Transfers & Layering</p>
        </div>
      </div>

      {/* Visual Chain Lanes Diagram */}
      <div className="card" style={{ padding: '20px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 16 }}>
          🌐 Multi-Chain Layering Topology
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, alignItems: 'center' }}>
          {/* Lane 1 */}
          <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(200, 109, 59, 0.4)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-copper-light)' }}>ORIGIN LANE</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>TRON Mainnet</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Victim Loss & Layering Mules</div>
          </div>

          {/* Bridge Lane */}
          <div style={{ padding: 14, background: 'rgba(217, 148, 59, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--accent-amber)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-amber)' }}>BRIDGE GATEWAY</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: '#F0A742', marginTop: 2 }}>Portal / Stargate</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Cross-Chain Lock & Mint</div>
          </div>

          {/* Lane 2 */}
          <div style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(217, 148, 59, 0.4)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#D9943B' }}>TRANSIT LANE</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>BNB Smart Chain</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>DEX Swaps & Peeling Hops</div>
          </div>

          {/* Terminal Lane */}
          <div style={{ padding: 14, background: 'rgba(212, 163, 89, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-gold)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent-gold)' }}>TERMINAL LANE</div>
            <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-gold)', marginTop: 2 }}>Ethereum / VASP</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>Exchange Deposit (FIU-IND)</div>
          </div>
        </div>
      </div>

      {/* Cross-Chain Events Table */}
      <div className="panel" style={{ margin: 0 }}>
        <div className="panel-header">
          <h3>Detected Cross-Chain Bridge Transfers</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>Case Reference</th>
                <th>Source Chain</th>
                <th>Bridge Protocol</th>
                <th>Destination Chain</th>
                <th>Transfer Amount</th>
                <th>Confidence</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {crossChainEvents.map(evt => (
                <tr key={evt.id}>
                  <td className="mono" style={{ color: 'var(--accent-copper-light)', fontWeight: 800 }}>{evt.id}</td>
                  <td style={{ fontWeight: 700 }}>{evt.caseName}</td>
                  <td><span className="badge badge-info">{evt.sourceChain}</span></td>
                  <td style={{ fontWeight: 800, color: '#F0A742' }}>{evt.bridgeProtocol}</td>
                  <td><span className="badge badge-fiu">{evt.destChain}</span></td>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                    ${evt.amount.toLocaleString()} {evt.token}
                  </td>
                  <td>
                    <span className="badge badge-fiu">{evt.confidence}% CONFIRMED</span>
                  </td>
                  <td>
                    <button
                      className="btn btn-outline"
                      onClick={() => handleOpenCase(evt.caseId)}
                      style={{ padding: '3px 8px', fontSize: '0.725rem' }}
                    >
                      Inspect Trail →
                    </button>
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
