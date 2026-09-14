import test from 'node:test';
import assert from 'node:assert/strict';
import { collection, errorMessage, formatAmount, normalizeCase, normalizeGraph } from './contracts.js';

test('canonical and compatibility collections are both accepted', () => {
  assert.deepEqual(collection({ items: [{ id: 1 }], cases: [] }, 'cases'), [{ id: 1 }]);
  assert.deepEqual(collection({ cases: [{ id: 2 }] }, 'cases'), [{ id: 2 }]);
});

test('standard errors and graph field aliases retain explicit unknowns', () => {
  assert.equal(errorMessage({ response: { data: { error: { message: 'Unavailable' } } } }), 'Unavailable');
  const graph = normalizeGraph({ nodes: [{ id: 'ETH:0x1', address: '0x1' }], edges: [{ id: 'e', asset: 'ETH', event_time: '2026-01-01T00:00:00Z', amount: '0' }] });
  assert.equal(graph.nodes[0].address, '0x1');
  assert.equal(graph.edges[0].token, 'ETH');
  assert.equal(graph.edges[0].amount, '0');
  assert.equal(formatAmount(null, 'ETH'), 'Unknown');
});

test('case normalization does not invent a score', () => {
  const item = normalizeCase({ status: 'investigating', compatibility_status: 'UNDER_INVESTIGATION' });
  assert.equal(item.display_status, 'UNDER_INVESTIGATION');
  assert.equal(item.risk_score, null);
  assert.equal(item.risk_tier, 'UNKNOWN');
});
