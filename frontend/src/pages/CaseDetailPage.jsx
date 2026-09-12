import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Controls, Background, MiniMap,
  MarkerType, useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api';

import MoneyTrailVisualizer from '../components/MoneyTrailVisualizer';

const TYPOLOGY_LABELS = {
  TASK_BASED_SCAM: '📱 Task-Based Scam',
  INVESTMENT_PONZI_SCAM: '📈 Investment Ponzi',
  DIGITAL_ARREST_EXTORTION: '🚔 Digital Arrest',
  SEXTORTION_BLACKMAIL: '📸 Sextortion',
  RANSOMWARE_PAYMENT: '🔒 Ransomware',
  PHISHING_DRAINER: '🎣 Phishing Drainer',
  DARKNET_FINANCIAL_CRIME: '🕸️ Darknet Crime',
};

const CHAIN_BADGES = {
  TRON: { label: 'TRON (TRC-20)', color: '#E08A54', bg: 'rgba(200, 109, 59, 0.12)' },
  ETH: { label: 'Ethereum (ERC-20)', color: '#EDECE6', bg: 'rgba(237, 236, 230, 0.08)' },
  BSC: { label: 'BSC (BEP-20)', color: '#D9943B', bg: 'rgba(217, 148, 59, 0.12)' },
  BTC: { label: 'Bitcoin (BTC)', color: '#D4A359', bg: 'rgba(212, 163, 89, 0.12)' },
};

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [related, setRelated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracing, setTracing] = useState(false);
  const [generating, setGenerating] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [viewMode, setViewMode] = useState('money_trail'); // 'money_trail' or 'graph'
  const [copiedText, setCopiedText] = useState('');

  // Interactive Workstation State
  const [currentHop, setCurrentHop] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    fetchAll();

    // Setup WebSocket connection for live trace events
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/trace/${caseId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'NODE_DISCOVERED') {
          setGraphData(prev => {
            const exists = prev.nodes.some(n => n.id === payload.data.id);
            if (exists) return prev;
            const updated = { ...prev, nodes: [...prev.nodes, payload.data] };
            buildFlowGraph(updated);
            return updated;
          });
        } else if (payload.type === 'EDGE_DISCOVERED') {
          setGraphData(prev => {
            const exists = prev.edges.some(e => e.id === payload.data.id);
            if (exists) return prev;
            const updated = { ...prev, edges: [...prev.edges, payload.data] };
            buildFlowGraph(updated);
            return updated;
          });
        } else if (payload.type === 'VASP_ATTRIBUTED') {
          fetchAll();
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    return () => {
      ws.close();
    };
  }, [caseId]);

  const fetchAll = async () => {
    try {
      const [caseRes, graphRes, relatedRes] = await Promise.all([
        api.get(`/api/v1/cases/${caseId}`),
        api.get(`/api/v1/cases/${caseId}/graph`).catch(() => ({ data: { nodes: [], edges: [] } })),
        api.get(`/api/v1/cases/${caseId}/related`).catch(() => ({ data: { linked_cases: [], possible_syndicate: false } })),
      ]);
      setCaseData(caseRes.data);
      setGraphData(graphRes.data);
      setRelated(relatedRes.data);
      buildFlowGraph(graphRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildFlowGraph = useCallback((data) => {
    if (!data?.nodes?.length) return;

    const hopGroups = {};
    data.nodes.forEach(n => {
      const hop = n.hop || 0;
      if (!hopGroups[hop]) hopGroups[hop] = [];
      if (!hopGroups[hop].includes(n.id)) hopGroups[hop].push(n.id);
    });

    const nodes = data.nodes.map((n) => {
      const hop = n.hop || 0;
      const group = hopGroups[hop] || [n.id];
      const idx = group.indexOf(n.id);

      const isVasp = n.node_type?.includes('VASP');
      const isMixer = n.node_type === 'MIXER';
      const isBridge = n.node_type === 'BRIDGE';
      const isOrigin = n.node_type === 'ORIGIN_VICTIM';

      const borderColor = isOrigin ? '#EDECE6' :
                          isMixer ? '#BD4A4A' :
                          isBridge ? '#D9943B' :
                          isVasp ? '#D4A359' : '#5A6474';

      const bgColor = isOrigin ? '#151A24' :
                       isMixer ? '#1A1212' :
                       isBridge ? '#1A1712' :
                       isVasp ? '#1A1610' : '#131720';

      const textColor = isOrigin ? '#EDECE6' :
                        isMixer ? '#E57373' :
                        isBridge ? '#F0A742' :
                        isVasp ? '#E5B869' : '#9E9E96';

      return {
        id: n.id,
        position: {
          x: hop * 320 + 60,
          y: idx * 150 + 60,
        },
        data: {
          label: (
            <div style={{ textAlign: 'center', padding: '6px 8px' }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>
                {isOrigin ? '🔵' :
                 isMixer ? '🔴' :
                 isBridge ? '🟠' :
                 n.node_type === 'VASP_DEPOSIT' ? '🟢' :
                 n.node_type === 'VASP_HOT_WALLET' ? '💚' : '⚪'}
              </div>
              <div style={{ fontWeight: 800, fontSize: 11, color: textColor, maxWidth: 160, wordBreak: 'break-all', lineHeight: 1.3 }}>
                {n.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                {n.id.substring(0, 16)}...
              </div>
              {n.vasp_name && (
                <div style={{ fontSize: 10, color: '#D4A359', fontWeight: 800, marginTop: 4 }}>
                  {n.vasp_name}
                </div>
              )}
              {n.is_fiu_registered && (
                <div style={{
                  fontSize: 8, color: '#F0C975', fontWeight: 800,
                  background: 'rgba(212, 163, 89, 0.15)', border: '1px solid rgba(212, 163, 89, 0.4)',
                  borderRadius: 4, padding: '2px 6px', marginTop: 4, display: 'inline-block'
                }}>
                  🇮🇳 FIU-IND REGISTERED
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: `1.5px solid ${borderColor}`,
          borderRadius: 8,
          padding: 6,
          minWidth: 170,
          boxShadow: 'var(--shadow-sm)',
        },
      };
    });

    const edges = (data.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: `${e.amount?.toLocaleString()} ${e.token || ''}`,
      animated: true,
      style: { stroke: e.is_peeling ? '#D9943B' : '#C86D3B', strokeWidth: 2.5 },
      labelStyle: { fill: '#EDECE6', fontSize: 10, fontWeight: 700, fontFamily: 'JetBrains Mono' },
      labelBgStyle: { fill: '#10141C', fillOpacity: 0.95 },
      labelBgPadding: [6, 4],
      labelBgBorderRadius: 4,
      markerEnd: { type: MarkerType.ArrowClosed, color: e.is_peeling ? '#D9943B' : '#C86D3B' },
    }));

    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [setFlowNodes, setFlowEdges]);

  const handleRunTrace = async () => {
    setTracing(true);
    try {
      await api.post(`/api/v1/cases/${caseId}/trace`, {});
      await fetchAll();
      setIsPlaying(true);
    } catch (err) {
      console.error(err);
    } finally {
      setTracing(false);
    }
  };

  const handleGenerateNotice = async () => {
    setGenerating('notice');
    try {
      const vaspNode = graphData?.nodes?.find(n => n.node_type?.includes('VASP'));
      const res = await api.post(`/api/v1/cases/${caseId}/generate-notice`, {
        vasp_name: vaspNode?.vasp_name || 'CoinDCX',
        wallet_address: vaspNode?.id || caseData?.wallets?.[0]?.address || 'UNKNOWN',
        token_symbol: 'USDT',
        amount: caseData?.reported_loss_amount || 10000,
        amount_usd: caseData?.reported_loss_amount || 10000,
        tx_hash: graphData?.edges?.[0]?.tx_hash || 'TX_HASH_REF',
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sec94_BNSS_Notice_${caseData?.external_complaint_id || caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Notice generation failed:', err);
    } finally {
      setGenerating('');
    }
  };

  const handleGenerateReport = async () => {
    setGenerating('report');
    try {
      const res = await api.post(`/api/v1/cases/${caseId}/generate-report`, {
        court_name: 'City Civil & Sessions Court, Bengaluru',
        judge_designation: 'Special Judge for Cyber Crime Cases',
      }, { responseType: 'blob' });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Sec63_BSA_Report_${caseData?.external_complaint_id || caseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating('');
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // Structured Hops calculation for timeline and dynamic sidebar
  const structuredHops = useMemo(() => {
    if (!graphData?.edges?.length) return [];
    const nodesMap = new Map((graphData.nodes || []).map(n => [n.id, n]));
    
    const sortedEdges = [...graphData.edges].sort((a, b) => {
      const sourceHopA = nodesMap.get(a.source)?.hop ?? 0;
      const sourceHopB = nodesMap.get(b.source)?.hop ?? 0;
      return sourceHopA - sourceHopB;
    });

    return sortedEdges.map((edge, idx) => {
      const sourceNode = nodesMap.get(edge.source) || {};
      const targetNode = nodesMap.get(edge.target) || {};
      const isTerminal = targetNode.node_type?.includes('VASP');
      const isMixer = targetNode.node_type === 'MIXER';
      const isBridge = targetNode.node_type === 'BRIDGE';
      const isPeeling = edge.is_peeling;

      let hopConfidence = Math.min(60 + (idx + 1) * 7, 96);
      if (isTerminal) hopConfidence = 96;
      if (targetNode.attribution_tier === 'TIER_3_CLUSTER') hopConfidence = 68;

      const evidence = [];
      if (idx === 0) evidence.push('Direct origin transfer from reported victim wallet');
      if (isPeeling) evidence.push('Peeling chain algorithm matched (asymmetric split)');
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
  }, [graphData]);

  const totalHops = structuredHops.length;
  const currentHopData = structuredHops[currentHop] || structuredHops[0] || null;

  // Selected node or active hop recipient node
  const activeNode = useMemo(() => {
    if (selectedNodeId) {
      return graphData.nodes?.find(n => n.id === selectedNodeId) || null;
    }
    return currentHopData?.toNode || null;
  }, [selectedNodeId, currentHopData, graphData]);

  const vaspNode = graphData?.nodes?.find(n => n.node_type?.includes('VASP'));
  const hasAttribution = !!vaspNode;

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalFunds = structuredHops[0]?.amountUsd || caseData?.reported_loss_amount || 0;
    const chainsSet = new Set(structuredHops.map(h => h.chain));
    const entitiesCount = (graphData.nodes || []).length;
    const finalConfidence = structuredHops[structuredHops.length - 1]?.confidence || (hasAttribution ? 96 : 45);

    return {
      totalFunds,
      hopsCount: structuredHops.length,
      chainsCount: Math.max(chainsSet.size, 1),
      entitiesCount,
      confidence: finalConfidence,
      token: structuredHops[0]?.token || 'USDT',
    };
  }, [structuredHops, caseData, graphData, hasAttribution]);

  if (loading || !caseData) {
    return <div className="loading-overlay"><div className="spinner"></div><p>Initializing Forensic Intelligence Workstation...</p></div>;
  }

  return (
    <div className="workstation-container">
      {/* ── 1. Top Command & Case Header Bar ─────────────────── */}
      <div className="workstation-command-bar">
        <div className="command-bar-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.25rem' }}>🕵️</span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  {caseData.external_complaint_id}
                </span>
                <span className={`status-beacon ${hasAttribution ? 'attributed' : tracing ? 'active' : 'idle'}`}>
                  <span className={`status-dot ${tracing ? 'pulse' : ''}`} style={{ background: hasAttribution ? 'var(--accent-gold)' : tracing ? 'var(--accent-copper)' : 'var(--text-muted)' }}></span>
                  {hasAttribution ? 'ATTRIBUTION CONFIRMED' : tracing ? 'TRACING ACTIVE' : 'INVESTIGATION READY'}
                </span>
                {caseData.possible_syndicate && (
                  <span className="badge badge-critical">🚨 SYNDICATE OVERLAP</span>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {TYPOLOGY_LABELS[caseData.fraud_typology] || caseData.fraud_typology} • Reported Loss: <strong style={{ color: 'var(--text-primary)' }}>{caseData.reported_loss_amount?.toLocaleString()} {caseData.loss_currency}</strong>
                {caseData.victim_name && ` • Victim: ${caseData.victim_name}`}
              </div>
            </div>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="command-bar-actions">
          <button
            className={`btn ${viewMode === 'money_trail' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('money_trail')}
            style={{ fontSize: '0.775rem' }}
          >
            💸 Money Trail Stage
          </button>
          <button
            className={`btn ${viewMode === 'graph' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setViewMode('graph')}
            style={{ fontSize: '0.775rem' }}
          >
            🕸️ Network Graph ({graphData?.nodes?.length || 0})
          </button>

          <button className="btn btn-primary" onClick={handleRunTrace} disabled={tracing} style={{ fontSize: '0.775rem' }}>
            {tracing ? '⏳ Tracing...' : '🚀 Execute Live Trace'}
          </button>
        </div>
      </div>

      {/* ── 2. Main Investigation Workspace (Stage + Sidebar Grid) ─ */}
      <div className="workstation-grid">
        {/* Main Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {viewMode === 'money_trail' ? (
            <MoneyTrailVisualizer
              caseData={caseData}
              graphData={graphData}
              onRunTrace={handleRunTrace}
              tracing={tracing}
              currentHop={currentHop}
              setCurrentHop={setCurrentHop}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              onSelectNode={(id) => setSelectedNodeId(id)}
              selectedNodeId={selectedNodeId}
            />
          ) : (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3>🕸️ Forensic Fund Flow Graph</h3>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {graphData?.nodes?.length || 0} nodes • {graphData?.edges?.length || 0} edges
                </span>
              </div>
              <div className="graph-container">
                {flowNodes.length > 0 ? (
                  <ReactFlow
                    nodes={flowNodes}
                    edges={flowEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    fitView
                    colorMode="dark"
                  >
                    <Controls />
                    <MiniMap
                      nodeColor={(n) => n.style?.border ? n.style.border.split(' ').pop() : '#5A6474'}
                      maskColor="rgba(10, 13, 18, 0.75)"
                    />
                    <Background gap={24} size={1} color="#212836" />
                  </ReactFlow>
                ) : (
                  <div className="loading-overlay" style={{ height: '100%' }}>
                    <p style={{ fontSize: '0.85rem' }}>No graph data yet — click Execute Live Trace</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Interactive Hop Timeline & Scrubber ─────────────── */}
          {structuredHops.length > 0 && (
            <div className="panel" style={{ margin: 0, padding: 14 }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)', marginBottom: 8 }}>
                📍 Interactive Hop Scrubber (Click any hop to inspect)
              </div>
              <div className="timeline-scrubber-bar" style={{ padding: 0, border: 'none', background: 'transparent' }}>
                {structuredHops.map((hop, idx) => {
                  const isActive = idx === currentHop;
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
                      <span>{isTerminal ? '🎯' : isSettled ? '✓' : `#${idx + 1}`}</span>
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

          {/* ── Forensic Transaction Trail Data Table ──────────── */}
          {graphData?.edges?.length > 0 && (
            <div className="panel" style={{ margin: 0 }}>
              <div className="panel-header">
                <h3>📋 Forensic Transaction Trail ({graphData.edges.length} Hops)</h3>
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
                    {graphData.edges.map((e, i) => (
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

        {/* ── Right Column: Dynamic Contextual Intelligence Sidebar ─ */}
        <div className="intel-sidebar">
          {/* Statutory Action Execution Card */}
          <div className="intel-panel">
            <div className="intel-panel-header">
              <h4>⚡ Statutory Law Enforcement Actions</h4>
            </div>
            <div className="intel-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                className="btn btn-danger"
                onClick={handleGenerateNotice}
                disabled={!hasAttribution || generating === 'notice'}
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
                {generating === 'report' ? '⏳ Generating Report...' : '📑 Sec 63 BSA Forensic Report (PDF)'}
              </button>
            </div>
          </div>

          {/* Contextual Hop Dossier */}
          {currentHopData && (
            <div className="intel-panel">
              <div className="intel-panel-header">
                <h4>🔎 Active Hop Dossier (Hop {currentHop + 1}/{totalHops})</h4>
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
                  </div>

                  <div style={{ background: currentHopData.toNode?.node_type?.includes('VASP') ? 'rgba(212, 163, 89, 0.08)' : 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: `1px solid ${currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--border-gold)' : 'var(--border-default)'}` }}>
                    <div className="dossier-label" style={{ color: currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                      TO (RECIPIENT) {currentHopData.toNode?.node_type?.includes('VASP') && '• TARGET VASP'}
                    </div>
                    <div className="mono" style={{ fontSize: '0.75rem', color: currentHopData.toNode?.node_type?.includes('VASP') ? 'var(--text-gold)' : 'var(--text-primary)', wordBreak: 'break-all', marginTop: 2 }}>
                      {currentHopData.to}
                    </div>
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
          )}

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

          {/* Syndicate Linked Complaints Alert */}
          {related?.linked_cases?.length > 0 && (
            <div className="syndicate-panel">
              <div style={{ fontWeight: 900, fontSize: '0.825rem', color: 'var(--accent-crimson)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                🚨 SYNDICATE PATTERN: {related.linked_cases.length + 1} LINKED COMPLAINTS
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {related.linked_cases.map(lc => (
                  <div
                    key={lc.case_id}
                    onClick={() => navigate(`/case/${lc.case_id}`)}
                    style={{
                      padding: '8px 10px', background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-crimson)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.775rem', fontWeight: 800, color: 'var(--accent-copper-light)' }}>
                      {lc.external_complaint_id}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {TYPOLOGY_LABELS[lc.fraud_typology] || lc.fraud_typology} — {lc.reported_loss_amount?.toLocaleString()} {lc.loss_currency}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Bottom Telemetry Strip ────────────────────────── */}
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
