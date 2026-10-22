'use strict';
const crypto = require('node:crypto');
const LOOPBACKS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
function endpointBase(raw, allowRemote = process.env.HEAVENZFIRE_ALLOW_REMOTE_AGENT_ENDPOINTS === '1') {
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Agent endpoint must use HTTP(S)');
  if (!allowRemote && !LOOPBACKS.has(u.hostname)) throw new Error('Remote agent endpoint blocked; set HEAVENZFIRE_ALLOW_REMOTE_AGENT_ENDPOINTS=1 only after reviewing the network boundary');
  return u.toString().replace(/\/$/, '');
}
function createAgentAdapters({ fetchImpl = globalThis.fetch, openSwarmBase = process.env.OPENSWARM_BASE_URL || 'http://127.0.0.1:18767', cognithorBase = process.env.COGNITHOR_BASE_URL || 'http://127.0.0.1:8741', openSwarmToken = process.env.OPENSWARM_API_KEY || '', timeoutMs = 12000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  const swarm = endpointBase(openSwarmBase);
  const cognithor = endpointBase(cognithorBase);
  async function request(url, options = {}) {
    const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    const raw = await response.text();
    let body; try { body = raw ? JSON.parse(raw) : null; } catch { body = { text: raw.slice(0, 500) }; }
    if (!response.ok) { const e = new Error('Agent endpoint returned HTTP ' + response.status); e.statusCode = response.status; e.body = body; throw e; }
    return body;
  }
  async function probeOpenSwarm() {
    try { const headers = openSwarmToken ? { authorization: 'Bearer ' + openSwarmToken } : {}; const body = await request(swarm + '/health', { headers }); const compatible = body && typeof body === 'object' && ['agent_count', 'agents', 'uptime', 'uptime_seconds', 'server_running'].some(k => Object.prototype.hasOwnProperty.call(body, k)); return { id: 'openswarm', state: compatible ? 'healthy' : 'incompatible-service', endpoint: swarm, detail: body }; }
    catch (e) { return { id: 'openswarm', state: e.statusCode === 401 || e.statusCode === 403 ? 'auth-required' : 'unreachable', endpoint: swarm, error: e.message, statusCode: e.statusCode || null }; }
  }
  async function probeCognithor() {
    try { const body = await request(cognithor + '/api/v1/health'); const compatible = body && body.status === 'ok' && typeof body.version === 'string'; return { id: 'cognithor', state: compatible ? 'healthy' : 'incompatible-service', endpoint: cognithor, detail: body }; }
    catch (e) { return { id: 'cognithor', state: 'unreachable', endpoint: cognithor, error: e.message, statusCode: e.statusCode || null }; }
  }
  async function dispatchCognithor(goal, { approved = false, sessionId } = {}) {
    if (approved !== true) throw new Error('Human approval required; no task was sent');
    if (typeof goal !== 'string' || !goal.trim() || goal.length > 4000) throw new Error('Goal must be 1-4000 characters');
    const bootstrap = await request(cognithor + '/api/v1/bootstrap');
    if (!bootstrap || typeof bootstrap.token !== 'string' || !bootstrap.token) throw new Error('Cognithor bootstrap did not return a token');
    const payload = { text: goal.trim(), metadata: { source: 'HeavenzFire Unified Field', request_id: crypto.randomUUID(), approval: 'human-approved' } };
    if (sessionId) payload.session_id = sessionId;
    const result = await request(cognithor + '/api/v1/message', { method: 'POST', headers: { authorization: 'Bearer ' + bootstrap.token, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
    return { integration: 'cognithor', dispatched: true, requestId: payload.metadata.request_id, result };
  }
  async function dispatchOpenSwarm(goal, { approved = false } = {}) {
    if (approved !== true) throw new Error('Human approval required; no task was sent');
    if (!openSwarmToken) throw new Error('OPENSWARM_API_KEY is not set; no task was sent');
    if (typeof goal !== 'string' || !goal.trim() || goal.length > 4000) throw new Error('Goal must be 1-4000 characters');
    const payload = { jsonrpc: '2.0', method: 'message', params: { text: goal.trim(), metadata: { source: 'HeavenzFire Unified Field', approval: 'human-approved' } }, id: crypto.randomUUID() };
    const result = await request(swarm + '/messages', { method: 'POST', headers: { authorization: 'Bearer ' + openSwarmToken, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(payload) });
    if (result && result.error) throw new Error('OpenSwarm JSON-RPC error: ' + JSON.stringify(result.error).slice(0, 500));
    return { integration: 'openswarm', dispatched: true, requestId: payload.id, result };
  }
  return { probeOpenSwarm, probeCognithor, dispatchCognithor, dispatchOpenSwarm };
}
module.exports = { createAgentAdapters, endpointBase };



[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
