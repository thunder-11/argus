import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const NODE_ICONS = {
  ORIGIN_VICTIM: '🔵',
  MULE_LAYER: '⚪',
  BURNER_WALLET: '🔥',
  MIXER: '🔴',
  BRIDGE: '🟠',
  VASP_DEPOSIT: '🟢',
  VASP_HOT_WALLET: '💚',
  DEFI_PROTOCOL: '🦄',
  UNKNOWN: '❓',
};

const CHAIN_COLORS = {
  TRON: { label: 'TRON NETWORK (TRC-20)', tag: 'TRON', color: '#E08A54', bg: 'rgba(200, 109, 59, 0.06)' },
  ETH: { label: 'ETHEREUM (ERC-20)', tag: 'ETH', color: '#EDECE6', bg: 'rgba(237, 236, 230, 0.05)' },
  BSC: { label: 'BNB SMART CHAIN (BEP-20)', tag: 'BSC', color: '#D9943B', bg: 'rgba(217, 148, 59, 0.06)' },
  BTC: { label: 'BITCOIN MAINNET', tag: 'BTC', color: '#D4A359', bg: 'rgba(212, 163, 89, 0.06)' },
  BRIDGE: { label: 'CROSS-CHAIN BRIDGE PORTAL', tag: 'BRIDGE', color: '#D9943B', bg: 'rgba(217, 148, 59, 0.1)' },
};

export default function MoneyTrailVisualizer({
  caseData,
  graphData,
  onRunTrace,
  tracing,
  currentHop,
  setCurrentHop,
  isPlaying,
  setIsPlaying,
  onSelectNode,
  selectedNodeId,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Animation State
  const [progress, setProgress] = useState(0); // 0.0 to 1.0 within current hop
  const [speed, setSpeed] = useState(1.0); // 0.5, 1, 2, 4
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Extract structured hops from graphData
  const structuredHops = useMemo(() => {
    if (!graphData?.edges?.length) return [];

    const nodesMap = new Map((graphData.nodes || []).map(n => [n.id, n]));
    
    // Sort edges by hop / chain sequence
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
      const isBridge = targetNode.node_type === 'BRIDGE' || edge.is_bridge_tx;
      const isPeeling = edge.is_peeling;

      const evidence = [`Backend-validated transfer ${edge.tx_hash}`];
      if (edge.temporal_partition) evidence.push(`Temporal partition: ${edge.temporal_partition}`);
      if (isPeeling) evidence.push('Deterministic peeling finding attached');
      if (isMixer) evidence.push('Reviewed privacy-protocol label attached');
      if (isBridge) evidence.push('Supported bridge evidence attached');
      if (isTerminal) evidence.push(`Reviewed ${targetNode.vasp_name || 'VASP'} attribution attached`);

      return {
        index: idx,
        id: edge.id,
        from: edge.source,
        to: edge.target,
        amount: edge.amount || 0,
        token: edge.token || edge.asset || null,
        amountUsd: null,
        chain: sourceNode.chain || targetNode.chain || edge.chain || 'UNKNOWN',
        targetChain: targetNode.chain || sourceNode.chain || edge.chain || 'UNKNOWN',
        txHash: edge.tx_hash,
        timestamp: edge.timestamp ? edge.timestamp.substring(0, 19).replace('T', ' ') : 'Unknown',
        fromNode: sourceNode,
        toNode: targetNode,
        isPeeling,
        isBridge,
        confidence: targetNode.attribution_score ?? null,
        evidence,
      };
    });
  }, [graphData]);

  // Extract ordered nodes:
  // Node 0 = starting/reported wallet
  // Node 1 = first intermediary
  // ...
  // Node N = final VASP
  const structuredNodes = useMemo(() => {
    if (!structuredHops.length) return [];

    const nodes = [];
    const firstHop = structuredHops[0];
    const originNode = firstHop.fromNode || {};

    // Node 0 (Origin Victim)
    nodes.push({
      id: firstHop.from,
      nodeIndex: 0,
      isOrigin: true,
      isTerminal: false,
      label: originNode.label || 'REPORTED VICTIM',
      sublabel: 'STARTING POINT',
      node_type: originNode.node_type || 'ORIGIN_VICTIM',
      chain: firstHop.chain,
      address: firstHop.from,
      amount: firstHop.amount,
      token: firstHop.token,
      rawNode: originNode,
    });

    // Target nodes for each hop
    structuredHops.forEach((hop, idx) => {
      const targetNode = hop.toNode || {};
      const isTerminal = (idx === structuredHops.length - 1) || targetNode.node_type?.includes('VASP');

      nodes.push({
        id: hop.to,
        nodeIndex: idx + 1,
        isOrigin: false,
        isTerminal,
        label: targetNode.vasp_name || targetNode.label || `HOP ${idx + 1}`,
        sublabel: isTerminal ? 'TARGET VASP' : `LAYER ${idx + 1}`,
        vasp_name: targetNode.vasp_name,
        node_type: targetNode.node_type || (isTerminal ? 'VASP_DEPOSIT' : 'MULE_LAYER'),
        chain: hop.targetChain || hop.chain,
        address: hop.to,
        amount: hop.amount,
        token: hop.token,
        rawNode: targetNode,
      });
    });

    return nodes;
  }, [structuredHops]);

  const totalHops = structuredHops.length;

  // Animation Ref for smooth 60fps tracking without React state lag
  const animRef = useRef({
    hopIndex: 0,
    progress: 0,
    initialPauseTimer: 0.85, // 0.85s brief staging pause on Node 0 at trace start
    isPlaying: false,
    speed: 1.0,
    trailEmbers: [],
    shockwaves: [],
    sparks: [],
    floats: [],
  });

  // Keep animRef in sync with outside props
  useEffect(() => {
    animRef.current.hopIndex = currentHop;
    animRef.current.progress = progress;
    animRef.current.isPlaying = isPlaying;
    animRef.current.speed = speed;
  }, [currentHop, progress, isPlaying, speed]);

  // Extract unique blockchain zones
  const chainZones = useMemo(() => {
    if (!structuredHops.length) return [];
    const zones = [];
    let currentChain = null;
    let startHop = 0;

    structuredHops.forEach((hop, i) => {
      const hopChain = hop.isBridge ? 'BRIDGE' : hop.chain;
      if (hopChain !== currentChain) {
        if (currentChain !== null) {
          zones.push({ chain: currentChain, startHop, endHop: i - 1 });
        }
        currentChain = hopChain;
        startHop = i;
      }
    });

    if (currentChain !== null) {
      zones.push({ chain: currentChain, startHop, endHop: structuredHops.length - 1 });
    }

    return zones;
  }, [structuredHops]);

  // Trigger Arrival Burst FX (Financial Forensics Palette)
  const triggerArrivalFx = useCallback((targetX, targetY, isVasp, amountText) => {
    const shockwaves = animRef.current.shockwaves;
    const sparks = animRef.current.sparks;
    const floats = animRef.current.floats;

    // 1. Shockwave Ripple
    shockwaves.push({
      x: targetX,
      y: targetY,
      r: 16,
      maxR: isVasp ? 65 : 40,
      color: isVasp ? '#D4A359' : '#C86D3B', // Gold or Copper
      opacity: 1.0,
    });

    // 2. Spark particles
    const particleCount = isVasp ? 24 : 12;
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount;
      const spd = isVasp ? (2.5 + Math.random() * 3) : (1.2 + Math.random() * 2);
      sparks.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: isVasp ? (i % 2 === 0 ? '#D4A359' : '#E5B869') : (i % 2 === 0 ? '#C86D3B' : '#E08A54'),
        life: 0,
        maxLife: 26 + Math.random() * 12,
      });
    }

    // 3. Floating text banner
    floats.push({
      x: targetX,
      y: targetY - 26,
      text: isVasp ? `🎯 VASP IDENTIFIED: ${amountText}` : `+${amountText}`,
      color: isVasp ? '#E5B869' : '#EDECE6',
      bg: isVasp ? '#1E1911' : '#181E29',
      border: isVasp ? '#D4A359' : '#C86D3B',
      opacity: 1.0,
    });
  }, []);

  // Compute node coordinates map
  const getCoordinatesMap = useCallback((displayWidth, displayHeight) => {
    const coordsMap = new Map();
    const totalNodes = structuredNodes.length;
    if (!totalNodes) return coordsMap;

    const paddingX = Math.min(110, displayWidth * 0.12);
    const availableWidth = displayWidth - (paddingX * 2);

    structuredNodes.forEach((n, idx) => {
      const x = paddingX + (idx / Math.max(totalNodes - 1, 1)) * availableWidth;
      const yOffset = (idx % 2 === 0 ? -44 : 44);
      const y = displayHeight / 2 + yOffset;
      coordsMap.set(n.id, { x, y, node: n, index: idx });
    });

    return coordsMap;
  }, [structuredNodes]);

  // Main 60 FPS Animation Engine Loop
  useEffect(() => {
    if (!totalHops) return;

    let animId;
    let lastTime = performance.now();

    const renderLoop = (now) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const state = animRef.current;

      if (state.isPlaying) {
        // Step 1: Initial Staging Pause on Node 0 (Starting Point)
        if (state.hopIndex === 0 && state.initialPauseTimer > 0) {
          state.initialPauseTimer -= delta * state.speed;
          state.progress = 0;
          setProgress(0);
        } else {
          // Step 2: Smooth Hop-by-Hop Edge Traversal
          const stepInc = (delta * state.speed) / 1.35; // 1.35s base duration per hop
          state.progress += stepInc;

          if (state.progress >= 1.0) {
            // Reached Target Node (Node index: state.hopIndex + 1)!
            const hop = structuredHops[state.hopIndex];
            const targetNode = structuredNodes[state.hopIndex + 1];

            if (hop && targetNode && canvasRef.current) {
              const canvas = canvasRef.current;
              const coordsMap = getCoordinatesMap(canvas.offsetWidth, canvas.offsetHeight);
              const targetPos = coordsMap.get(targetNode.id);

              if (targetPos) {
                triggerArrivalFx(
                  targetPos.x,
                  targetPos.y,
                  targetNode.isTerminal,
                  `${hop.amount?.toLocaleString()} ${hop.token}`
                );
              }
            }

            if (state.hopIndex < totalHops - 1) {
              // Advance to next hop
              state.hopIndex += 1;
              state.progress = 0;
              state.initialPauseTimer = 0;
              setCurrentHop(state.hopIndex);
              setProgress(0);
            } else {
              // Complete entire trail at terminal VASP
              state.isPlaying = false;
              state.progress = 1.0;
              setIsPlaying(false);
              setProgress(1.0);
            }
          } else {
            setProgress(state.progress);
          }
        }
      }

      // Draw Canvas Frame
      drawCanvasFrame();

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [totalHops, structuredHops, structuredNodes, setCurrentHop, setIsPlaying, triggerArrivalFx, getCoordinatesMap]);

  // Canvas Render Frame
  const drawCanvasFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas || !structuredHops.length || !structuredNodes.length) return;

    const ctx = canvas.getContext('2d');
    const width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    const height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const { hopIndex, progress: curProg, initialPauseTimer, shockwaves, sparks, floats, trailEmbers } = animRef.current;
    const coordsMap = getCoordinatesMap(displayWidth, displayHeight);

    // Determine current active node index:
    // When hopIndex === 0 and progress === 0 (or during initial pause): Node 0 is ACTIVE
    // When progress > 0 and progress < 1: Hop is in flight from Node hopIndex to Node hopIndex + 1
    // When progress === 1: Node hopIndex + 1 is ACTIVE
    const isAtStartNode0 = hopIndex === 0 && (curProg === 0 || initialPauseTimer > 0);
    const activeNodeIndex = isAtStartNode0 ? 0 : curProg >= 1 ? hopIndex + 1 : hopIndex;

    // 0. Draw Background Blockchain Zones
    if (chainZones.length > 0) {
      const paddingX = Math.min(110, displayWidth * 0.12);
      const availableWidth = displayWidth - (paddingX * 2);
      const totalNodes = structuredNodes.length;

      chainZones.forEach((z) => {
        const startX = paddingX + (z.startHop / Math.max(totalNodes - 1, 1)) * availableWidth - 36;
        const endX = paddingX + ((z.endHop + 1) / Math.max(totalNodes - 1, 1)) * availableWidth + 36;
        const zoneWidth = Math.max(endX - startX, 100);

        const config = CHAIN_COLORS[z.chain] || CHAIN_COLORS.TRON;

        ctx.fillStyle = config.bg;
        ctx.fillRect(startX, 10, zoneWidth, displayHeight - 20);

        ctx.strokeStyle = 'rgba(33, 40, 54, 0.6)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(startX, 10, zoneWidth, displayHeight - 20);
        ctx.setLineDash([]);

        ctx.fillStyle = config.color;
        ctx.font = 'bold 9px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`ZONE: ${config.label}`, startX + 12, 26);
      });
    }

    // 1. Draw Curved Bezier Edges
    structuredHops.forEach((h, idx) => {
      const start = coordsMap.get(h.from);
      const end = coordsMap.get(h.to);
      if (!start || !end) return;

      const isCompleted = idx < hopIndex || (idx === hopIndex && curProg >= 1.0);
      const isActive = idx === hopIndex && !isAtStartNode0;

      // Arc curvature
      const midX = (start.x + end.x) / 2;
      const arcOffset = (idx % 2 === 0 ? -30 : 30);
      const midY = (start.y + end.y) / 2 + arcOffset;

      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.quadraticCurveTo(midX, midY, end.x, end.y);

      if (isCompleted) {
        ctx.strokeStyle = '#5C9C76'; // Completed desaturated sage
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else if (isActive) {
        ctx.strokeStyle = '#C86D3B'; // Active Burnt Copper glow
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = '#212836'; // Upcoming hop
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Edge Amount Label on curve peak
      const labelX = 0.25 * start.x + 0.5 * midX + 0.25 * end.x;
      const labelY = 0.25 * start.y + 0.5 * midY + 0.25 * end.y - 8;

      ctx.fillStyle = isActive ? '#E08A54' : isCompleted ? '#7BC497' : '#62656E';
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${h.amount?.toLocaleString()} ${h.token}`, labelX, labelY);

      // 2. Draw Moving Money Particle along Quadratic Curve
      if (isActive && !isReducedMotion && curProg > 0 && curProg < 1) {
        const t = curProg;
        const pX = (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * midX + t * t * end.x;
        const pY = (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * midY + t * t * end.y;

        // Spawn ember trail
        if (Math.random() < 0.6) {
          trailEmbers.push({
            x: pX + (Math.random() - 0.5) * 4,
            y: pY + (Math.random() - 0.5) * 4,
            opacity: 0.8,
            size: 2 + Math.random() * 2,
          });
        }

        // Draw Embers
        for (let ei = trailEmbers.length - 1; ei >= 0; ei--) {
          const emb = trailEmbers[ei];
          emb.opacity -= 0.04;
          if (emb.opacity <= 0) {
            trailEmbers.splice(ei, 1);
            continue;
          }
          ctx.beginPath();
          ctx.arc(emb.x, emb.y, emb.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 109, 59, ${emb.opacity})`;
          ctx.fill();
        }

        // Outer Glow Aura
        const grad = ctx.createRadialGradient(pX, pY, 2, pX, pY, 22);
        grad.addColorStop(0, 'rgba(200, 109, 59, 0.95)');
        grad.addColorStop(0.5, 'rgba(217, 148, 59, 0.4)');
        grad.addColorStop(1, 'rgba(200, 109, 59, 0)');

        ctx.beginPath();
        ctx.arc(pX, pY, 22, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core Particle
        ctx.beginPath();
        ctx.arc(pX, pY, 9, 0, Math.PI * 2);
        ctx.fillStyle = '#EDECE6';
        ctx.shadowColor = '#C86D3B';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#C86D3B';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', pX, pY);
      }
    });

    // 2B. Particle Stationed EXACTLY at Node 0 during Initial Pause / Start
    if (isAtStartNode0 && structuredNodes[0]) {
      const node0Pos = coordsMap.get(structuredNodes[0].id);
      if (node0Pos) {
        const pX = node0Pos.x;
        const pY = node0Pos.y;

        // Breathing Radiant Glow on Node 0
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.25;
        const grad = ctx.createRadialGradient(pX, pY, 4, pX, pY, 28 * pulse);
        grad.addColorStop(0, 'rgba(237, 236, 230, 0.8)');
        grad.addColorStop(0.5, 'rgba(200, 109, 59, 0.4)');
        grad.addColorStop(1, 'rgba(200, 109, 59, 0)');

        ctx.beginPath();
        ctx.arc(pX, pY, 28 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    // 3. Draw Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const sw = shockwaves[i];
      sw.r += 1.8;
      sw.opacity -= 0.035;

      if (sw.opacity <= 0 || sw.r >= sw.maxR) {
        shockwaves.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(sw.opacity, 0);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // 4. Draw Impact Sparks
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.life += 1;

      const alpha = 1 - sp.life / sp.maxLife;
      if (sp.life >= sp.maxLife) {
        sparks.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = sp.color;
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // 5. Draw Floating Badges
    for (let i = floats.length - 1; i >= 0; i--) {
      const fl = floats[i];
      fl.y -= 0.5;
      fl.opacity -= 0.018;

      if (fl.opacity <= 0) {
        floats.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = Math.max(fl.opacity, 0);

      ctx.font = 'bold 10px Inter, sans-serif';
      const textWidth = ctx.measureText(fl.text).width;
      const padX = 10;
      const padY = 5;

      ctx.fillStyle = fl.bg;
      ctx.strokeStyle = fl.border;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.roundRect(fl.x - textWidth / 2 - padX, fl.y - padY - 6, textWidth + padX * 2, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = fl.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(fl.text, fl.x, fl.y + 2);
      ctx.restore();
    }

    // 6. Draw Nodes in Precise Sequence (Node 0, Node 1, ..., Node N)
    structuredNodes.forEach((n, idx) => {
      const pos = coordsMap.get(n.id);
      if (!pos) return;

      const isNode0 = n.isOrigin;
      const isCompleted = idx < activeNodeIndex;
      const isActiveNode = idx === activeNodeIndex;
      const isSelected = selectedNodeId === n.id;

      // ── A. STARTING POINT (NODE 0) SPECIAL UI ──
      if (isNode0) {
        if (isActiveNode) {
          // Double Radiant Pulse Halo around Node 0
          const haloPulse1 = 26 + (Math.sin(Date.now() * 0.007) * 4);
          const haloPulse2 = 34 + (Math.sin(Date.now() * 0.004) * 6);

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, haloPulse1, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(237, 236, 230, 0.9)';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, haloPulse2, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(200, 109, 59, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // STARTING POINT Beacon Box above Node 0
          const startBadge = '⚡ STARTING POINT (REPORTED WALLET)';
          ctx.font = 'bold 9px JetBrains Mono, monospace';
          const bW = ctx.measureText(startBadge).width;
          ctx.fillStyle = '#1A1E29';
          ctx.strokeStyle = '#EDECE6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(pos.x - bW / 2 - 8, pos.y - 42, bW + 16, 18, 4);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#EDECE6';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(startBadge, pos.x, pos.y - 33);
        }
      } else {
        // Active Pulse for other nodes
        if (isActiveNode && animRef.current.isPlaying) {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
          ctx.strokeStyle = n.isTerminal ? 'rgba(212, 163, 89, 0.8)' : 'rgba(200, 109, 59, 0.6)';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // Selection Halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.strokeStyle = '#D4A359';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, n.isTerminal ? 22 : isNode0 ? 18 : 16, 0, Math.PI * 2);

      if (n.isTerminal) {
        ctx.fillStyle = '#1A1610';
        ctx.strokeStyle = '#D4A359'; // Warm Gold
        ctx.lineWidth = 3.5;
      } else if (isNode0) {
        ctx.fillStyle = isActiveNode ? '#1E2533' : '#151A24';
        ctx.strokeStyle = isActiveNode ? '#EDECE6' : '#5C9C76'; // Ivory when active, Sage when completed
        ctx.lineWidth = 3.5;
      } else if (n.node_type === 'MIXER') {
        ctx.fillStyle = '#1A1212';
        ctx.strokeStyle = '#BD4A4A'; // Crimson
        ctx.lineWidth = 3.5;
      } else if (n.node_type === 'BRIDGE') {
        ctx.fillStyle = '#1A1712';
        ctx.strokeStyle = '#D9943B'; // Amber
        ctx.lineWidth = 3.5;
      } else {
        ctx.fillStyle = isCompleted ? '#18202D' : isActiveNode ? '#20293A' : '#151A24';
        ctx.strokeStyle = isCompleted ? '#5C9C76' : isActiveNode ? '#C86D3B' : '#2B3445';
        ctx.lineWidth = isActiveNode ? 3 : 2;
      }

      ctx.fill();
      ctx.stroke();

      // Node Icon
      ctx.font = n.isTerminal ? '16px sans-serif' : '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(NODE_ICONS[n.node_type] || (isNode0 ? '🔵' : '⚪'), pos.x, pos.y);

      // Node Label Below
      ctx.fillStyle = n.isTerminal ? '#E5B869' : isNode0 ? '#EDECE6' : isActiveNode ? '#E08A54' : '#B8BAC2';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(n.label?.substring(0, 16) || n.id.substring(0, 8), pos.x, pos.y + (isNode0 ? 22 : 24));

      // Sub-label / Address
      ctx.fillStyle = 'rgba(184, 186, 194, 0.65)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText(n.address.substring(0, 10) + '...', pos.x, pos.y + (isNode0 ? 34 : 36));
    });
  };

  // Canvas Click Handler (Node Selection)
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !structuredNodes.length) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const displayWidth = canvas.offsetWidth;
    const displayHeight = canvas.offsetHeight;
    const coordsMap = getCoordinatesMap(displayWidth, displayHeight);

    for (let idx = 0; idx < structuredNodes.length; idx++) {
      const n = structuredNodes[idx];
      const pos = coordsMap.get(n.id);
      if (!pos) continue;

      const dist = Math.hypot(clickX - pos.x, clickY - pos.y);
      if (dist <= 26) {
        if (onSelectNode) onSelectNode(n.id, n);
        return;
      }
    }
  };

  // Playback Controls
  const togglePlay = () => {
    if (!totalHops) return;
    if (isPlaying) {
      setIsPlaying(false);
      animRef.current.isPlaying = false;
    } else {
      if (currentHop >= totalHops - 1 && progress >= 1) {
        handleRestart();
        return;
      }
      setIsPlaying(true);
      animRef.current.isPlaying = true;
    }
  };

  const handleRestart = () => {
    setCurrentHop(0);
    setProgress(0);
    animRef.current.hopIndex = 0;
    animRef.current.progress = 0;
    animRef.current.initialPauseTimer = 0.85; // reset initial pause so Node 0 is highlighted first
    animRef.current.isPlaying = true;
    setIsPlaying(true);
    if (onSelectNode && structuredNodes[0]) {
      onSelectNode(structuredNodes[0].id, structuredNodes[0]);
    }
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    animRef.current.isPlaying = false;
    animRef.current.initialPauseTimer = 0;

    if (currentHop < totalHops - 1) {
      const nextHop = currentHop + 1;
      setCurrentHop(nextHop);
      setProgress(0);
      animRef.current.hopIndex = nextHop;
      animRef.current.progress = 0;
      if (onSelectNode && structuredNodes[nextHop + 1]) {
        onSelectNode(structuredNodes[nextHop + 1].id, structuredNodes[nextHop + 1]);
      }
    } else {
      setProgress(1.0);
      animRef.current.progress = 1.0;
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    animRef.current.isPlaying = false;

    if (animRef.current.progress > 0.08) {
      setProgress(0);
      animRef.current.progress = 0;
      animRef.current.initialPauseTimer = 0;
    } else if (currentHop > 0) {
      const prevHop = currentHop - 1;
      setCurrentHop(prevHop);
      setProgress(0);
      animRef.current.hopIndex = prevHop;
      animRef.current.progress = 0;
      animRef.current.initialPauseTimer = prevHop === 0 ? 0.6 : 0;
      if (onSelectNode && structuredNodes[prevHop]) {
        onSelectNode(structuredNodes[prevHop].id, structuredNodes[prevHop]);
      }
    } else {
      // Return to Node 0
      setProgress(0);
      animRef.current.progress = 0;
      animRef.current.initialPauseTimer = 0.6;
      if (onSelectNode && structuredNodes[0]) {
        onSelectNode(structuredNodes[0].id, structuredNodes[0]);
      }
    }
  };

  if (!structuredHops.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '56px 24px', background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
        {tracing ? (
          <div>
            <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px', borderColor: 'rgba(200, 109, 59, 0.2)', borderTopColor: 'var(--accent-copper)' }}></div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              ⚡ Value-Weighted BFS Forward Tracing Active
            </p>
            <p style={{ color: 'var(--accent-copper-light)', fontSize: '0.85rem', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
              Traversing on-chain transactions across TRON, ETH & BSC nodes...
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              No Active Money Trail Traced Yet
            </p>
            <p style={{ color: 'var(--text-secondary)', marginTop: 6, marginBottom: 24, maxWidth: 460, margin: '6px auto 24px' }}>
              Click "Execute Real-Time Trace" to begin automated forward hop traversal, peeling chain detection, and VASP deposit attribution.
            </p>
            <button className="btn btn-primary btn-lg" onClick={onRunTrace} style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
              🚀 Execute Real-Time Trace
            </button>
          </div>
        )}
      </div>
    );
  }

  const isAtNode0 = currentHop === 0 && progress === 0;

  return (
    <div className="canvas-stage-wrapper" ref={containerRef}>
      {/* Canvas Header Bar */}
      <div className="canvas-stage-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            💸 Cinematic Money Trail Stage
          </span>
          <span className={`badge ${isAtNode0 ? 'badge-primary' : 'badge-info'}`}>
            {isAtNode0 ? '🔵 NODE 0: STARTING POINT' : `HOP ${currentHop + 1} OF ${totalHops}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setIsReducedMotion(!isReducedMotion)} style={{ padding: '3px 8px', fontSize: '0.725rem' }}>
            {isReducedMotion ? '🎬 Enable Particles' : '⏸️ Reduced Motion'}
          </button>
          <button className="btn btn-outline" onClick={handleRestart} style={{ padding: '3px 10px', fontSize: '0.725rem' }}>
            🔄 Replay from Start
          </button>
        </div>
      </div>

      {/* Viewport Canvas Stage */}
      <div className="canvas-stage-viewport">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        />
      </div>

      {/* Scrubber & Controls Deck */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-default)',
        flexWrap: 'wrap', gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn btn-outline" onClick={handleStepBack} style={{ padding: '5px 10px', fontSize: '0.75rem' }} title="Step Back">
            ⏮️ Step Back
          </button>

          <button className="btn btn-primary" onClick={togglePlay} style={{ minWidth: 110, justifyContent: 'center', padding: '5px 14px' }}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play Trail'}
          </button>

          <button className="btn btn-outline" onClick={handleStepForward} style={{ padding: '5px 10px', fontSize: '0.75rem' }} title="Step Forward">
            Step Forward ⏭️
          </button>
        </div>

        {/* Speed Multipliers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', marginRight: 4 }}>SPEED:</span>
          {[0.5, 1.0, 2.0, 4.0].map(s => (
            <button
              key={s}
              className={`btn ${speed === s ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSpeed(s)}
              style={{ padding: '2px 7px', fontSize: '0.7rem', minWidth: 34, justifyContent: 'center' }}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
