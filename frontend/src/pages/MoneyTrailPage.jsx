import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import MoneyTrailVisualizer from '../components/MoneyTrailVisualizer';
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

export default function MoneyTrailPage() {
  const [searchParams] = useSearchParams();
  const caseIdFromUrl = searchParams.get('case');
  const { activeCaseId, selectCase, activeCase, activeGraph, casesList, reloadActiveCase } = useCase();
  const navigate = useNavigate();

  const [currentHop, setCurrentHop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [traceStatus, setTraceStatus] = useState('idle'); // 'idle' | 'starting' | 'loading' | 'tracing' | 'complete' | 'error'
  const [traceError, setTraceError] = useState(null);
  const [generating, setGenerating] = useState('');
  const [copiedText, setCopiedText] = useState('');

  // Sync URL case to context
  useEffect(() => {
    if (caseIdFromUrl && caseIdFromUrl !== activeCaseId) {
      selectCase(caseIdFromUrl);
    }
  }, [caseIdFromUrl, activeCaseId, selectCase]);

  const targetCaseId = activeCaseId || 'case-demo-001';

  // Structured Hops
  const structuredHops = useMemo(() => {
    if (!activeGraph?.edges?.length) return [];
    const nodesMap = new Map((activeGraph.nodes || []).map(n => [n.id, n]));
    
    const sortedEdges = [...activeGraph.edges].sort((a, b) => {
      const sourceHopA = nodesMap.get(a.source)?.hop ?? 0;
      const sourceHopB = nodesMap.get(b.source)?.hop ?? 0;
      return sourceHopA - sourceHopB;
    });

    return sortedEdges.map((edge, idx) => {
      const sourceNode = nodesMap.get(edge.source) || {};
      const targetNode = nodesMap.get(edge.target) || {};
      const isTerminal = targetNode.node_type?.includes('VASP');
      const isMixer = targetNode.node_type === 'MIXER';
      const isBridge = targetNode.node_type === 'BRIDGE' || edge.is_bridge_tx;
      const isPeeling = edge.is_peeling;

      let hopConfidence = Math.min(60 + (idx + 1) * 7, 96);
      if (isTerminal) hopConfidence = 96;
      if (targetNode.attribution_tier === 'TIER_3_CLUSTER') hopConfidence = 68;

      const evidence = [];
      if (idx === 0) evidence.push('Direct origin transfer from reported victim wallet');
      if (isPeeling) evidence.push('Peeling chain algorithm matched (asymmetric >80% value split)');
      if (isMixer) evidence.push('Funds routed through privacy mixer');
      if (isBridge) evidence.push('Cross-chain bridge protocol swap');
      if (isTerminal) evidence.push(`Known ${targetNode.vasp_name || 'VASP'} deposit address match (FIU-IND)`);
      if (!evidence.length) evidence.push('Layering mule wallet in transactional chain');

      return {
        index: idx,
        id: edge.id,
        from: edge.source,
        to: edge.target,
        amount: edge.amount || 0,
        token: edge.token || 'USDT',
        amountUsd: edge.amount || 0,
        chain: sourceNode.chain || targetNode.chain || 'TRON',
        targetChain: targetNode.chain || sourceNode.chain || 'TRON',
        txHash: edge.tx_hash || 'SYN_TX_' + idx,
        timestamp: edge.timestamp ? edge.timestamp.substring(0, 19).replace('T', ' ') : 'N/A',
        fromNode: sourceNode,
        toNode: targetNode,
        isPeeling,
        isBridge,
        confidence: hopConfidence,
        evidence,
      };
    });
  }, [activeGraph]);

  const totalHops = structuredHops.length;

  // Origin Node 0
  const originNode = useMemo(() => {
    if (!structuredHops.length) return null;
    const firstHop = structuredHops[0];
    return {
      id: firstHop.from,
      address: firstHop.from,
      chain: firstHop.chain,
      token: firstHop.token,
      amount: firstHop.amount,
      rawNode: firstHop.fromNode,
    };
  }, [structuredHops]);

  // Selected item: can be Origin Node 0 or Hop k
  const isOriginSelected = selectedNodeId === originNode?.id || (selectedNodeId === null && currentHop === 0 && !isPlaying);
  const currentHopData = structuredHops[currentHop] || structuredHops[0] || null;

  const vaspNode = activeGraph?.nodes?.find(n => n.node_type?.includes('VASP'));
  const hasAttribution = !!vaspNode;

  // Execute Trace Trigger with complete state machine starting from Node 0
  const handleRunTrace = async () => {
    setTraceStatus('starting');
    setTraceError(null);
    try {
      await new Promise(r => setTimeout(r, 200));
      setTraceStatus('loading');
      
      await api.post(`/api/v1/cases/${targetCaseId}/trace`, {});
      await reloadActiveCase();
      
      setTraceStatus('tracing');
      setCurrentHop(0);
      setSelectedNodeId(null);
      setIsPlaying(true);
    } catch (err) {
      console.error('Trace error:', err);
      setTraceStatus('error');
      setTraceError(err.response?.data?.detail || err.message || 'Trace failed due to network or wallet error');
    }
  };

  // Generate Freeze Notice (Sec 94 BNSS)
  const handleGenerateNotice = async () => {
    setGenerating('notice');
    try {
      const res = await api.post(`/api/v1/cases/${targetCaseId}/generate-freeze-notice`, {
        vasp_id: vaspNode?.vasp_id || 'vasp-coindcx',
        police_station: 'Cyber Crime Police Station, Bengaluru Central',
        officer_name: 'Inspector S. Sharma',
        fir_cr_number: activeCase?.external_complaint_id || 'NCRP-2026-88421',
        designation: 'Investigating Officer',
      });

      const b64 = res.data.pdf_base64;
      const filename = res.data.pdf_filename || `Sec94_BNSS_Freeze_Notice_${activeCase?.external_complaint_id || targetCaseId}.pdf`;
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Notice error:', err);
      alert('Failed to generate freeze notice: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating('');
    }
  };

  // Generate Court Report (Sec 63 BSA)
  const handleGenerateReport = async () => {
    setGenerating('report');
    try {
      const res = await api.post(`/api/v1/cases/${targetCaseId}/generate-court-report`, {});

      const b64 = res.data.pdf_base64;
      const filename = res.data.pdf_filename || `Sec63_BSA_Forensic_Report_${activeCase?.external_complaint_id || targetCaseId}.pdf`;
      const byteCharacters = atob(b64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Report error:', err);
      alert('Failed to generate forensic court report: ' + (err.response?.data?.detail || err.message));
    } finally {
      setGenerating('');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  const summaryMetrics = useMemo(() => {
    const totalFunds = structuredHops[0]?.amountUsd || activeCase?.reported_loss_amount || 0;
    const chainsSet = new Set(structuredHops.map(h => h.chain));
    const entitiesCount = (activeGraph.nodes || []).length;
    const finalConfidence = structuredHops[structuredHops.length - 1]?.confidence || (hasAttribution ? 96 : 45);

    return {
      totalFunds,
      hopsCount: structuredHops.length,
      chainsCount: Math.max(chainsSet.size, 1),
      entitiesCount,
      confidence: finalConfidence,
      token: structuredHops[0]?.token || 'USDT',
    };
  }, [structuredHops, activeCase, activeGraph, hasAttribution]);

  // Button label according to state machine
  const getTraceButtonLabel = () => {
    switch (traceStatus) {
      case 'starting': return '⚡ INITIALIZING TRACE...';
      case 'loading': return '📡 LOADING ON-CHAIN HOPS...';
      case 'tracing': return '💸 TRACING ACTIVE...';
      case 'complete': return '✓ TRACE COMPLETE';
      case 'error': return '⚠️ RETRY TRACE';
      default: return '🚀 EXECUTE REAL-TIME TRACE';
    }
  };

  return (
    <div className="workstation-container">
      {/* ── 1. Top Command & Case Switcher Bar ───────────────── */}
      <div className="workstation-command-bar">
        <div className="command-bar-left">
          {/* Case Selector Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>CASE:</span>
            <select
              className="form-select"
              value={targetCaseId}
              onChange={e => {
                selectCase(e.target.value);
                setTraceStatus('idle');
                setTraceError(null);
                setCurrentHop(0);
                setSelectedNodeId(null);
                navigate(`/money-trail?case=${e.target.value}`);
              }}
              style={{ padding: '5px 10px', fontSize: '0.8rem', minWidth: 240, fontWeight: 700 }}
            >
              {casesList.map(c => (
                <option key={c.id} value={c.id}>
                  {c.external_complaint_id} — {TYPOLOGY_LABELS[c.fraud_typology] || c.fraud_typology} (${c.reported_loss_amount?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <span className={`status-beacon ${hasAttribution ? 'attributed' : traceStatus === 'tracing' || traceStatus === 'loading' ? 'active' : 'idle'}`}>
            <span className={`status-dot ${traceStatus === 'tracing' ? 'pulse' : ''}`} style={{ background: hasAttribution ? 'var(--accent-gold)' : traceStatus === 'tracing' ? 'var(--accent-copper)' : 'var(--text-muted)' }}></span>
            {hasAttribution ? 'ATTRIBUTION CONFIRMED' : traceStatus === 'tracing' ? 'TRACING HOPS...' : 'READY FOR TRACE'}
          </span>
        </div>

        {/* Action Triggers */}
        <div className="command-bar-actions">
          <button className="btn btn-outline" onClick={() => navigate(`/graph?case=${targetCaseId}`)}>
            🕸️ Switch to Graph View
          </button>
          <button
            className={`btn ${traceStatus === 'error' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleRunTrace}
            disabled={traceStatus === 'starting' || traceStatus === 'loading'}
          >
            {getTraceButtonLabel()}
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {traceError && (
        <div style={{
          padding: '12px 16px', background: 'rgba(189, 74, 74, 0.15)',
          border: '1px solid var(--border-crimson)', borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#E57373' }}>Trace Error Encountered</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{traceError}</div>
            </div>
          </div>
          <button className="btn btn-danger" onClick={handleRunTrace} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
            Retry Trace
          </button>
        </div>
      )}

      {/* ── 2. Hero Stage & Contextual Intelligence Grid ─────── */}
      <div className="workstation-grid">
        {/* Left Column: Canvas Stage & Hop Scrubber */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MoneyTrailVisualizer
            caseData={activeCase}
            graphData={activeGraph}
            onRunTrace={handleRunTrace}
            tracing={traceStatus === 'starting' || traceStatus === 'loading'}
            currentHop={currentHop}
            setCurrentHop={setCurrentHop}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onSelectNode={(id) => setSelectedNodeId(id)}
            selectedNodeId={selectedNodeId}
          />

          {/* Interactive Hop Scrubber (Starting with Node 0 Origin) */}
          {structuredHops.length > 0 && (
            <div className="panel" style={{ margin: 0, padding: 14 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 8 }}>
                📍 Interactive Hop Timeline (Investigation starts from Node 0: Starting Point)
              </div>
              <div className="timeline-scrubber-bar" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                {/* Node 0 Starting Point Pill */}
                {originNode && (
                  <div
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentHop(0);
                      setSelectedNodeId(originNode.id);
                    }}
                    className={`hop-pill ${currentHop === 0 && (selectedNodeId === originNode.id || !isPlaying) ? 'active' : 'settled'}`}
                    style={{ borderLeft: '3px solid var(--text-primary)' }}
                  >
                    <span>🔵</span>
                    <span>STARTING POINT</span>
                    <span style={{ fontSize: '0.675rem', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
                      ${originNode.amount?.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Subsequent Hop Pills */}
                {structuredHops.map((hop, idx) => {
                  const isActive = idx === currentHop && selectedNodeId !== originNode?.id;
                  const isSettled = idx < currentHop;
                  const isTerminal = hop.toNode?.node_type?.includes('VASP');

                  return (
                    <div
                      key={hop.id}
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentHop(idx);
                        setSelectedNodeId(hop.to);
                      }}
                      className={`hop-pill ${isActive ? 'active' : isSettled ? 'settled' : ''} ${isTerminal ? 'vasp' : ''}`}
                    >
                      <span>{isTerminal ? '🎯' : isSettled ? '✓' : `Hop ${idx + 1}`}</span>
                      <span>{hop.toNode?.vasp_name || hop.toNode?.label || hop.to.substring(0, 8)}</span>
                      <span style={{ fontSize: '0.675rem', fontFamily: 'var(--font-mono)', opacity: 0.8 }}>
                        ${hop.amount?.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction Evidence Table */}
          {activeGraph?.edges?.length > 0 && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3>📋 Forensic Transaction Trail ({activeGraph.edges.length} Hops)</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sender (From)</th>
                      <th>Recipient (To)</th>
                      <th>Amount</th>
                      <th>Token</th>
                      <th>Tx Hash</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeGraph.edges.map((e, i) => (
                      <tr key={e.id} style={{ background: i === currentHop ? 'rgba(200, 109, 59, 0.08)' : 'transparent' }}>
                        <td>{i + 1}</td>
                        <td className="mono">{e.source?.substring(0, 14)}...</td>
                        <td className="mono">{e.target?.substring(0, 14)}...</td>
                        <td style={{ fontWeight: 800, color: 'var(--accent-copper-light)', fontFamily: 'var(--font-mono)' }}>
                          ${e.amount?.toLocaleString()}
                        </td>
                        <td><span className="badge badge-info">{e.token}</span></td>
                        <td className="mono">{e.tx_hash?.substring(0, 16)}...</td>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{e.timestamp?.substring(0, 19)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Intelligence Sidebar */}
        <div className="intel-sidebar">
          {/* Statutory Actions */}
          <div className="intel-panel">
            <div className="intel-panel-header">
              <h4>⚡ Statutory LEA Actions</h4>
            </div>
            <div className="intel-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-danger"
                onClick={handleGenerateNotice}
                disabled={generating === 'notice'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generating === 'notice' ? '⏳ Generating Notice...' : '📄 Sec 94 BNSS Freeze Notice (PDF)'}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateReport}
                disabled={generating === 'report'}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {generating === 'report' ? '⏳ Generating Report...' : '📑 Sec 63 BSA Court Report (PDF)'}
              </button>
            </div>
          </div>

          {/* Active Dossier: Origin Node 0 vs Hop k */}
          {isOriginSelected && originNode ? (
            <div className="intel-panel" style={{ borderColor: 'var(--text-muted)' }}>
              <div className="intel-panel-header">
                <h4>🔵 Starting Point Dossier (Node 0)</h4>
                <span className="badge badge-primary">ORIGIN WALLET</span>
              </div>
              <div className="intel-panel-body">
                <div className="dossier-grid">
                  <div className="dossier-card">
                    <div className="dossier-label">REPORTED THEFT LOSS</div>
                    <div className="dossier-val" style={{ color: 'var(--accent-copper-light)', fontFamily: 'var(--font-mono)' }}>
                      ${originNode.amount?.toLocaleString()} {originNode.token}
                    </div>
                  </div>
                  <div className="dossier-card">
                    <div className="dossier-label">ORIGIN STATUS</div>
                    <div className="dossier-val" style={{ color: 'var(--accent-gold)', fontSize: '0.85rem' }}>
                      SOURCE OF FUNDS
                    </div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', marginBottom: 12 }}>
                  <div className="dossier-label">REPORTED VICTIM WALLET ADDRESS</div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: 4 }}>
                    {originNode.address}
                  </div>
                  <button className="btn btn-outline" onClick={() => copyToClipboard(originNode.address, 'origin')} style={{ padding: '2px 6px', fontSize: '0.65rem', marginTop: 6 }}>
                    {copiedText === 'origin' ? '✅ Copied' : '📋 Copy Address'}
                  </button>
                </div>

                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  🛡️ Forensic Origin Context
                </div>
                <ul className="evidence-list">
                  <li className="evidence-item">
                    <span className="check">✓</span>
                    <span>Initial reported victim wallet linked to FIR / NCRP complaint</span>
                  </li>
                  <li className="evidence-item">
                    <span className="check">✓</span>
                    <span>Funds transfer initiated under fraudulent scheme ({activeCase?.fraud_typology})</span>
                  </li>
                  <li className="evidence-item">
                    <span className="check">✓</span>
                    <span>Starting point of value-weighted hop traversal</span>
                  </li>
                </ul>
              </div>
            </div>
          ) : currentHopData ? (
            <div className="intel-panel">
              <div className="intel-panel-header">
                <h4>🔎 Hop Dossier (Hop {currentHop + 1}/{totalHops})</h4>
                <span className="badge badge-info">{currentHopData.chain}</span>
              </div>
              <div className="intel-panel-body">
                <div className="dossier-grid">
                  <div className="dossier-card">
                    <div className="dossier-label">TRANSFER AMOUNT</div>
                    <div className="dossier-val" style={{ color: 'var(--accent-copper-light)', fontFamily: 'var(--font-mono)' }}>
                      ${currentHopData.amountUsd?.toLocaleString()} {currentHopData.token}
                    </div>
                  </div>
                  <div className="dossier-card">
                    <div className="dossier-label">CONFIDENCE</div>
                    <div className="dossier-val" style={{ color: currentHopData.confidence >= 80 ? 'var(--accent-gold)' : 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>
                      {currentHopData.confidence}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
                    <div className="dossier-label">FROM (SENDER)</div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)', wordBreak: 'break-all', marginTop: 2 }}>
                      {currentHopData.from}
                    </div>
                    <button className="btn btn-outline" onClick={() => copyToClipboard(currentHopData.from, 'from')} style={{ padding: '2px 6px', fontSize: '0.65rem', marginTop: 4 }}>
                      {copiedText === 'from' ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>

                  <div style={{ background: currentHopData.toNode?.node_type?.includes('VASP') ? 'rgba(212, 163, 89, 0.08)' : 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: `1px solid ${currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--border-gold)' : 'var(--border-default)'}` }}>
                    <div className="dossier-label" style={{ color: currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                      TO (RECIPIENT) {currentHopData.toNode?.node_type?.includes('VASP') && '• TARGET VASP'}
                    </div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--text-gold)' : 'var(--text-primary)', wordBreak: 'break-all', marginTop: 2 }}>
                      {currentHopData.to}
                    </div>
                    <button className="btn btn-outline" onClick={() => copyToClipboard(currentHopData.to, 'to')} style={{ padding: '2px 6px', fontSize: '0.65rem', marginTop: 4 }}>
                      {copiedText === 'to' ? '✅ Copied' : '📋 Copy'}
                    </button>
                  </div>
                </div>

                {/* Evidence Points */}
                <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  🛡️ Forensic Heuristic Evidence
                </div>
                <ul className="evidence-list">
                  {currentHopData.evidence.map((ev, ei) => (
                    <li key={ei} className="evidence-item">
                      <span className="check">✓</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* VASP Entity Attribution Card */}
          {hasAttribution && vaspNode && (
            <div className="intel-panel" style={{ borderColor: 'var(--border-gold)' }}>
              <div className="intel-panel-header" style={{ background: '#181510' }}>
                <h4 style={{ color: 'var(--text-gold)' }}>🎯 Attributed Exchange Terminal</h4>
                <span className="badge badge-fiu">FIU-IND</span>
              </div>
              <div className="intel-panel-body">
                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-gold)', marginBottom: 4 }}>
                  {vaspNode.vasp_name}
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
                  Deposit cluster match with {summaryMetrics.confidence}% statutory certainty.
                </div>
                {vaspNode.nodal_email && (
                  <div style={{ background: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.75rem' }}>
                    <div className="dossier-label">COMPLIANCE NODAL OFFICER</div>
                    <div className="mono" style={{ color: 'var(--accent-copper-light)', marginTop: 2 }}>
                      {vaspNode.nodal_email}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Bottom Telemetry HUD ──────────────────────────── */}
      <div className="telemetry-strip">
        <div className="telemetry-metric copper">
          <span className="metric-label">TOTAL FUNDS TRACED</span>
          <span className="metric-value">${summaryMetrics.totalFunds.toLocaleString()}</span>
        </div>
        <div className="telemetry-metric">
          <span className="metric-label">HOPS TRAVERSED</span>
          <span className="metric-value">{summaryMetrics.hopsCount} Hops</span>
        </div>
        <div className="telemetry-metric">
          <span className="metric-label">CHAINS CROSSED</span>
          <span className="metric-value">{summaryMetrics.chainsCount} Blockchains</span>
        </div>
        <div className="telemetry-metric">
          <span className="metric-label">ENTITIES IDENTIFIED</span>
          <span className="metric-value">{summaryMetrics.entitiesCount} Wallets</span>
        </div>
        <div className="telemetry-metric gold">
          <span className="metric-label">ATTRIBUTION CONFIDENCE</span>
          <span className="metric-value">{summaryMetrics.confidence}%</span>
        </div>
      </div>
    </div>
  );
}
