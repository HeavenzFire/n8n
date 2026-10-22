'use strict';
const http = require('node:http');
const path = require('node:path');
const { createRegistry } = require('./adapters/registry.cjs');
const { createAgentAdapters } = require('./adapters/agent-adapters.cjs');
const HOST = '127.0.0.1';
const PORT = Number(process.env.HF_INTEGRATION_PORT || 18790);
function send(res, status, value) { const body=JSON.stringify(value); res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','access-control-allow-origin':'http://127.0.0.1:18795','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Content-Type'}); res.end(body); }
function createIntegrationServer({ registry=createRegistry(), agents=createAgentAdapters(), fetchImpl=globalThis.fetch, guardianUrl='http://127.0.0.1:18795/api/guardian' }={}) {
  async function guardian() { try { const r=await fetchImpl(guardianUrl,{headers:{accept:'application/json'},signal:AbortSignal.timeout(1800)}); const body=await r.json().catch(()=>({})); return {reachable:r.ok, httpStatus:r.status, overall:body.overall || body.state?.overall || 'unknown', findings:body.findings || body.state?.findings || [], host:body.host || body.state?.host || null, remediation:body.remediation || body.state?.remediation || 'unknown'}; } catch(e) { return {reachable:false,overall:'unknown',findings:['Guardian endpoint unreachable'],error:String(e.message||e).slice(0,200),remediation:'disabled'}; } }
  const server=http.createServer(async(req,res)=>{
    if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'http://127.0.0.1:18795','access-control-allow-methods':'GET, OPTIONS','access-control-allow-headers':'Content-Type'});return res.end();}
    const u=new URL(req.url,'http://'+HOST+':'+PORT);
    if(req.method!=='GET') return send(res,405,{ok:false,error:'Read-only integration API; only GET is supported.'});
    if(u.pathname==='/health') return send(res,200,{ok:true,service:'heavenzfire-integration-bridge',host:HOST,port:PORT,mode:'read-only; no arbitrary command execution',dispatchEnabled:false});
    if(u.pathname==='/api/integrations') { try{return send(res,200,{ok:true,schema:'heavenzfire.integration-list.v1',integrations:registry.integrations()});}catch(e){return send(res,500,{ok:false,error:'Integration manifest could not be read.'});} }
    if(u.pathname==='/api/agents/health') { const results=await Promise.all([agents.probeOpenSwarm(),agents.probeCognithor()]); return send(res,200,{ok:true,schema:'heavenzfire.agent-health.v1',checkedAt:new Date().toISOString(),dispatchEnabled:false,agents:results}); }
    if(u.pathname==='/api/integrations/health') { const [core,agentResults,g]=await Promise.all([registry.health(),Promise.all([agents.probeOpenSwarm(),agents.probeCognithor()]),guardian()]); const findings=[...g.findings]; if(!g.reachable) findings.push('Guardian endpoint is unreachable'); const critical=g.overall==='critical'||core.overall==='critical'; const services=[...core.services,...agentResults]; return send(res,200,{ok:!critical,schema:'heavenzfire.integration-health.v1',checkedAt:new Date().toISOString(),overall:critical?'critical':core.overall,host:g.host,remediation:'disabled-until-separately-tested-and-approved',dispatchEnabled:false,guardian:g,services,findings,summary:{total:services.length,healthy:services.filter(x=>x.state==='healthy').length,unhealthy:services.filter(x=>x.state!=='healthy').length,requiredFailures:core.summary.requiredFailures}}); }
    return send(res,404,{ok:false,error:'Not found'});
  });
  return server;
}
if(require.main===module){const server=createIntegrationServer();server.listen(PORT,HOST,()=>process.stdout.write('HeavenzFire integration bridge listening at http://'+HOST+':'+PORT+'\n'));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));}
module.exports={createIntegrationServer,HOST,PORT};


[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
