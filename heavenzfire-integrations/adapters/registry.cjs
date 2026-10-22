'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const DEFAULT_ENDPOINTS = [
  { id: 'browserbridge', name: 'BrowserBridge', url: 'http://127.0.0.1:18795/health', required: true },
  { id: 'unified-field-dashboard', name: 'Unified Field dashboard', url: 'http://127.0.0.1:8800/health', required: true },
  { id: 'local-inference', name: 'Local inference gateway', url: 'http://127.0.0.1:11800/health', required: true },
  { id: 'micro-mind-sandbox', name: 'Micro Mind Sandbox', url: 'http://127.0.0.1:11811/api/health', required: false },
  { id: 'ollama', name: 'Ollama', url: 'http://127.0.0.1:11434/api/tags', required: true },
  { id: 'n8n', name: 'n8n', url: 'http://127.0.0.1:5678/healthz', required: false }
];
const SAFE_ID = /^[a-z][a-z0-9-]{0,63}$/;
function readManifest(file) { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')); }
function validateTaskEnvelope(task, allowedIntegrations = ['openswarm', 'cognithor']) {
  if (!task || typeof task !== 'object' || Array.isArray(task)) return { ok: false, error: 'task must be an object' };
  if (typeof task.goal !== 'string' || !task.goal.trim() || task.goal.length > 4000) return { ok: false, error: 'goal must be 1-4000 characters' };
  const id = task.integration;
  if (typeof id !== 'string' || !SAFE_ID.test(id)) return { ok: false, error: 'integration must be a safe integration id' };
  if (!allowedIntegrations.includes(id)) return { ok: false, error: 'integration is not enabled in the allowlist' };
  if (task.approval !== 'human-approved') return { ok: false, error: 'human approval is required before execution' };
  if (task.mode && task.mode !== 'bounded-local-task') return { ok: false, error: 'unsupported execution mode' };
  return { ok: true, value: { requestId: crypto.randomUUID(), integration: id, goal: task.goal.trim(), mode: 'bounded-local-task', approval: 'human-approved', receivedAt: new Date().toISOString(), execution: 'not-dispatched-by-registry' } };
}
function createRegistry({ fetchImpl = globalThis.fetch, manifestPath = path.join(__dirname, '..', 'integration-manifest.json'), endpoints = DEFAULT_ENDPOINTS, timeoutMs = 1800 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');
  function integrations() {
    const manifest = readManifest(manifestPath);
    return manifest.integrations.map(item => ({ id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: item.name, upstream: item.upstream, fork: item.fork, license: item.license ?? null, status: item.status, role: item.role, sourceSnapshotPath: item.sourceSnapshotPath ?? null, adapterState: 'not-wired' }));
  }
  async function probe(endpoint) {
    const started = Date.now();
    try {
      const response = await fetchImpl(endpoint.url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: 'application/json' } });
      let body = null;
      try { body = await response.json(); } catch {}
      return { id: endpoint.id, name: endpoint.name, url: endpoint.url, required: endpoint.required, state: response.ok ? 'healthy' : 'unhealthy', statusCode: response.status, latencyMs: Date.now() - started, detail: body && typeof body === 'object' ? { ok: body.ok ?? null, status: body.status ?? null } : null };
    } catch (error) {
      return { id: endpoint.id, name: endpoint.name, url: endpoint.url, required: endpoint.required, state: 'unreachable', statusCode: null, latencyMs: Date.now() - started, error: error && error.name === 'TimeoutError' ? 'timeout' : String(error && error.message || error).slice(0, 240) };
    }
  }
  async function health() {
    const results = await Promise.all(endpoints.map(probe));
    const requiredFailures = results.filter(r => r.required && r.state !== 'healthy').length;
    return { schema: 'heavenzfire.integration-health.v1', checkedAt: new Date().toISOString(), overall: requiredFailures ? 'critical' : 'healthy', policy: 'read-only; no automatic remediation', services: results, summary: { total: results.length, healthy: results.filter(r => r.state === 'healthy').length, unhealthy: results.filter(r => r.state !== 'healthy').length, requiredFailures } };
  }
  return { integrations, health, validateTaskEnvelope };
}
module.exports = { createRegistry, validateTaskEnvelope, DEFAULT_ENDPOINTS };


[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
