'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createRegistry, validateTaskEnvelope } = require('./registry.cjs');
const manifestPath = require('node:path').join(__dirname, '..', 'integration-manifest.json');
test('integration manifest loads without mutating upstream projects', () => { const r=createRegistry({fetchImpl: async()=>({ok:true,status:200,json:async()=>({ok:true})}),manifestPath}); const list=r.integrations(); assert.ok(list.length >= 3); assert.ok(list.every(x=>x.adapterState==='not-wired')); assert.ok(list.some(x=>x.id==='openswarm')); assert.ok(list.some(x=>x.id==='cognithor')); });
test('task contract rejects missing goal', () => assert.equal(validateTaskEnvelope({integration:'openswarm',approval:'human-approved'}).ok,false));
test('task contract rejects unknown/unscoped execution modes', () => assert.equal(validateTaskEnvelope({integration:'openswarm',goal:'inspect',approval:'human-approved',mode:'powershell'}).ok,false));
test('task contract requires explicit human approval', () => assert.equal(validateTaskEnvelope({integration:'openswarm',goal:'inspect'}).ok,false));
test('task contract rejects integration outside the allowlist', () => assert.equal(validateTaskEnvelope({integration:'shell',goal:'inspect',approval:'human-approved'}).ok,false));
test('task contract rejects malformed integration identifiers', () => assert.equal(validateTaskEnvelope({integration:'../../shell',goal:'inspect',approval:'human-approved'}).ok,false));
test('approved bounded task is validated but never dispatched by registry', () => { const x=validateTaskEnvelope({integration:'openswarm',goal:'Read-only capability check',approval:'human-approved',mode:'bounded-local-task'}); assert.equal(x.ok,true); assert.equal(x.value.execution,'not-dispatched-by-registry'); assert.ok(x.value.requestId); });
test('health reports required endpoint failures as critical', async () => { const r=createRegistry({manifestPath,endpoints:[{id:'required',name:'required',url:'http://unit.invalid',required:true}],fetchImpl:async()=>{throw new Error('offline')}}); const h=await r.health(); assert.equal(h.overall,'critical'); assert.equal(h.summary.requiredFailures,1); });
test('optional endpoint failure does not mark overall health critical', async () => { const r=createRegistry({manifestPath,endpoints:[{id:'optional',name:'optional',url:'http://unit.invalid',required:false}],fetchImpl:async()=>{throw new Error('offline')}}); const h=await r.health(); assert.equal(h.overall,'healthy'); assert.equal(h.summary.unhealthy,1); });
test('HTTP 500 is counted as unhealthy', async () => { const r=createRegistry({manifestPath,endpoints:[{id:'x',name:'x',url:'http://unit.invalid',required:true}],fetchImpl:async()=>({ok:false,status:500,json:async()=>({})})}); const h=await r.health(); assert.equal(h.services[0].state,'unhealthy'); assert.equal(h.overall,'critical'); });


[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
