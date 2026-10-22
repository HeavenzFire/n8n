'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createAgentAdapters, endpointBase } = require('./agent-adapters.cjs');
function response(status, body) { return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) }; }
test('rejects remote endpoints by default', () => assert.throws(() => endpointBase('https://example.com'), /Remote agent endpoint blocked/));
test('allows loopback endpoints', () => assert.equal(endpointBase('http://127.0.0.1:8741'), 'http://127.0.0.1:8741'));
test('Cognithor health probe reads documented health route', async () => { const a=createAgentAdapters({fetchImpl:async url=>{assert.equal(url,'http://127.0.0.1:8741/api/v1/health');return response(200,{status:'ok',version:'0.99.0'})}}); const r=await a.probeCognithor(); assert.equal(r.state,'healthy'); assert.equal(r.detail.version,'0.99.0'); });
test('OpenSwarm missing authentication is reported, not treated as healthy', async () => { const a=createAgentAdapters({fetchImpl:async()=>{const e=new Error('HTTP 401');e.statusCode=401;throw e}}); const r=await a.probeOpenSwarm(); assert.equal(r.state,'auth-required'); });
test('OpenSwarm probe rejects a different local service on the configured port', async () => { const a=createAgentAdapters({fetchImpl:async()=>response(200,{ok:true,service:'heavenzfire-device-bridge'})}); const r=await a.probeOpenSwarm(); assert.equal(r.state,'incompatible-service'); });
test('Cognithor dispatch refuses without explicit approval and makes no requests', async () => { let calls=0; const a=createAgentAdapters({fetchImpl:async()=>{calls++;return response(200,{})}}); await assert.rejects(a.dispatchCognithor('test task'),/Human approval required/); assert.equal(calls,0); });
test('Cognithor dispatch obtains ephemeral bootstrap token and sends approved task', async () => { const calls=[]; const a=createAgentAdapters({fetchImpl:async (url,opts={})=>{calls.push({url,opts}); if(url.endsWith('/api/v1/bootstrap'))return response(200,{token:'ephemeral-test-token'}); if(url.endsWith('/api/v1/message'))return response(200,{text:'done',session_id:'s1'}); throw new Error('unexpected URL '+url)}}); const r=await a.dispatchCognithor('read-only integration check',{approved:true}); assert.equal(r.dispatched,true); assert.equal(calls.length,2); assert.equal(calls[1].opts.headers.authorization,'Bearer ephemeral-test-token'); assert.equal(JSON.parse(calls[1].opts.body).text,'read-only integration check'); });
test('OpenSwarm dispatch requires explicit approval and token', async () => { let calls=0; const a=createAgentAdapters({openSwarmToken:'',fetchImpl:async()=>{calls++;return response(200,{})}}); await assert.rejects(a.dispatchOpenSwarm('test',{approved:true}),/OPENSWARM_API_KEY/); assert.equal(calls,0); });
test('OpenSwarm approved dispatch uses documented JSON-RPC message route', async () => { let seen; const a=createAgentAdapters({openSwarmToken:'test-token',fetchImpl:async(url,opts)=>{seen={url,opts};return response(200,{jsonrpc:'2.0',result:{accepted:true}})}}); const r=await a.dispatchOpenSwarm('bounded research',{approved:true}); assert.equal(seen.url,'http://127.0.0.1:18767/messages'); assert.equal(JSON.parse(seen.opts.body).method,'message'); assert.equal(r.dispatched,true); });



[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
