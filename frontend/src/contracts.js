export function collection(payload, legacyKey) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  return Array.isArray(payload[legacyKey]) ? payload[legacyKey] : [];
}

export function errorMessage(error, fallback = 'The request could not be completed.') {
  const body = error?.response?.data;
  if (typeof body?.error?.message === 'string') return body.error.message;
  if (typeof body?.detail === 'string') return body.detail;
  if (Array.isArray(body?.detail)) return body.detail.map(item => item.msg).filter(Boolean).join('; ') || fallback;
  if (typeof body?.message === 'string') return body.message;
  return error?.message || fallback;
}

export function normalizeCase(item) {
  if (!item) return null;
  return {
    ...item,
    display_status: item.compatibility_status || item.status || 'UNKNOWN',
    risk_tier: item.risk_tier || 'UNKNOWN',
    risk_score: item.risk_score ?? null,
  };
}

export function normalizeGraph(payload) {
  const nodes = (payload?.nodes || []).map(node => ({
    ...node,
    address: node.address || node.id,
    label: node.label || node.address || node.id,
    node_type: node.node_type || 'WALLET',
  }));
  const edges = (payload?.edges || []).map(edge => ({
    ...edge,
    token: edge.token || edge.asset || null,
    timestamp: edge.timestamp || edge.event_time || null,
    amount: edge.amount ?? null,
  }));
  return {
    ...(payload || {}),
    nodes,
    edges,
    context_nodes: payload?.context_nodes || [],
    context_edges: payload?.context_edges || [],
    coverage: payload?.coverage || { state: 'unknown' },
  };
}

export function formatAmount(value, asset) {
  if (value === null || value === undefined || value === '') return 'Unknown';
  return `${String(value)}${asset ? ` ${asset}` : ''}`;
}

export function isUnavailableCoverage(coverage) {
  return ['partial', 'unavailable'].includes(coverage?.state);
}
