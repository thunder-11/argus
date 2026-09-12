import { useState, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow, Controls, Background, MiniMap,
  MarkerType, useNodesState, useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCase } from '../context/CaseContext';

export default function TransactionGraphPage() {
  const { activeCase, activeGraph, casesList, selectCase } = useCase();
  const [selectedEntityFilter, setSelectedEntityFilter] = useState('ALL');
  const [selectedNode, setSelectedNode] = useState(null);
  const navigate = useNavigate();

  // Layout Nodes & Edges
  const { nodes, edges } = useMemo(() => {
    if (!activeGraph?.nodes?.length) return { nodes: [], edges: [] };

    // Filter nodes based on selectedEntityFilter
    const filteredRawNodes = selectedEntityFilter === 'ALL'
      ? activeGraph.nodes
      : activeGraph.nodes.filter(n => {
          if (selectedEntityFilter === 'VASP') return n.node_type?.includes('VASP');
          if (selectedEntityFilter === 'MIXER') return n.node_type === 'MIXER';
          if (selectedEntityFilter === 'BRIDGE') return n.node_type === 'BRIDGE';
          if (selectedEntityFilter === 'MULE') return n.node_type === 'MULE_LAYER';
          if (selectedEntityFilter === 'VICTIM') return n.node_type === 'ORIGIN_VICTIM';
          return true;
        });

    const hopGroups = {};
    filteredRawNodes.forEach(n => {
      const hop = n.hop || 0;
      if (!hopGroups[hop]) hopGroups[hop] = [];
      if (!hopGroups[hop].includes(n.id)) hopGroups[hop].push(n.id);
    });

    const flowNodes = filteredRawNodes.map((n) => {
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
        position: { x: hop * 300 + 60, y: idx * 140 + 60 },
        data: {
          raw: n,
          label: (
            <div style={{ textAlign: 'center', padding: '6px 8px' }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>
                {isOrigin ? '🔵' : isMixer ? '🔴' : isBridge ? '🟠' : isVasp ? '🟢' : '⚪'}
              </div>
              <div style={{ fontWeight: 800, fontSize: 11, color: textColor, maxWidth: 150, wordBreak: 'break-all' }}>
                {n.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>
                {n.id.substring(0, 14)}...
              </div>
              {n.vasp_name && (
                <div style={{ fontSize: 9, color: '#D4A359', fontWeight: 800, marginTop: 2 }}>
                  {n.vasp_name}
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
          minWidth: 160,
          boxShadow: 'var(--shadow-sm)',
        },
      };
    });

    const filteredNodeIds = new Set(filteredRawNodes.map(n => n.id));
    const flowEdges = (activeGraph.edges || [])
      .filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target))
      .map(e => ({
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

    return { nodes: flowNodes, edges: flowEdges };
  }, [activeGraph, selectedEntityFilter]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node.data.raw);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header Bar */}
      <div className="page-header" style={{ margin: 0 }}>
        <div>
          <h1>🕸️ Transaction Relationship Graph Explorer</h1>
          <p className="subtitle">Interactive Multihop Network Graph & Entity Clustering</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => navigate('/money-trail')}>
            💸 Switch to Money Trail
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>ENTITY FILTER:</span>
          {['ALL', 'VICTIM', 'MULE', 'MIXER', 'BRIDGE', 'VASP'].map(f => (
            <button
              key={f}
              onClick={() => setSelectedEntityFilter(f)}
              className={`btn ${selectedEntityFilter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '3px 8px', fontSize: '0.7rem' }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Showing <strong>{nodes.length}</strong> Nodes • <strong>{edges.length}</strong> Edges
        </div>
      </div>

      {/* Graph Area + Selected Node Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedNode ? '1fr 340px' : '1fr', gap: 16 }}>
        <div className="panel" style={{ margin: 0, height: 600 }}>
          {nodes.length > 0 ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
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
              <p style={{ fontSize: '0.9rem' }}>No graph nodes match the active filter criteria.</p>
            </div>
          )}
        </div>

        {/* Node Inspector Drawer */}
        {selectedNode && (
          <div className="intel-panel">
            <div className="intel-panel-header">
              <h4>🔎 Entity Inspector</h4>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedNode(null)}
                style={{ padding: '2px 6px', fontSize: '0.65rem' }}
              >
                ✕ Close
              </button>
            </div>
            <div className="intel-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div className="dossier-label">WALLET / CONTRACT ADDRESS</div>
                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--accent-copper-light)', wordBreak: 'break-all', marginTop: 2 }}>
                  {selectedNode.id}
                </div>
              </div>

              <div className="dossier-grid">
                <div className="dossier-card">
                  <div className="dossier-label">ENTITY TYPE</div>
                  <div className="dossier-val">{selectedNode.node_type}</div>
                </div>
                <div className="dossier-card">
                  <div className="dossier-label">BLOCKCHAIN</div>
                  <div className="dossier-val">{selectedNode.chain || 'TRON'}</div>
                </div>
              </div>

              {selectedNode.vasp_name && (
                <div style={{ background: 'rgba(212, 163, 89, 0.1)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-gold)' }}>
                  <div className="dossier-label" style={{ color: 'var(--accent-gold)' }}>ATTRIBUTED VASP</div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-gold)', marginTop: 2 }}>
                    {selectedNode.vasp_name}
                  </div>
                  {selectedNode.is_fiu_registered && (
                    <div style={{ fontSize: '0.7rem', color: '#7BC497', marginTop: 4 }}>
                      ✓ FIU-IND Compliance Registered
                    </div>
                  )}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={() => navigate(`/wallets?address=${selectedNode.id}&chain=${selectedNode.chain || 'TRON'}`)}
                style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}
              >
                🔎 Deep-Dive Wallet Intelligence →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
