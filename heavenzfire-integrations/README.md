# HeavenzFire Unified Field integration assets

This folder contains importable workflow assets and adapter clients for the HeavenzFire fork of n8n. These additions live outside n8n core so upstream updates remain manageable.

## Guardian and integration health workflow

Import [the workflow JSON](unified-field-guardian-health.json) into a self-hosted n8n instance running on the same host/network namespace as the Unified Field integration bridge. It reads `http://127.0.0.1:18790/api/integrations/health`, preserves service status, disk state/free space, findings, and remediation policy. It is configured for manual execution and a five-minute schedule but remains inactive by default.

**Safety:** read-only. It does not run shell commands, repair services, change repositories, or perform remediation. The observed `overall=critical` state is explained by low C: drive free space (about 6.4 GB, below the Guardian's 8 GB critical threshold), not by the five core services in the Guardian service list. Host memory is also near its warning threshold. Recover disk space before installing more large runtimes.

## Manifest and Windows acceptance gate

- [Machine-readable integration manifest](integration-manifest.json)
- [PowerShell acceptance script](Test-HeavenzFireIntegrations.ps1) — checks live local services, agent availability, workflow structure, and the 21 adapter contract tests.

## Local integration bridge

- [Bridge server](adapter-server.cjs) — loopback-only, read-only HTTP service.
- [Windows launcher](Start-IntegrationBridge.ps1) — starts it on `127.0.0.1:18790` and refuses to replace an unrelated process.
- [Bridge tests](adapter-server.test.cjs)
- `GET /health` — bridge health and dispatch-disabled policy.
- `GET /api/integrations` — integration manifest.
- `GET /api/agents/health` — live OpenSwarm and Cognithor endpoint probes.
- `GET /api/integrations/health` — combined Guardian, local service, and agent health.

The bridge binds to loopback only. It supports GET and OPTIONS only; it exposes no HTTP task-dispatch route and cannot execute arbitrary commands.

## Agent adapter clients

- [Agent adapters](adapters/agent-adapters.cjs) — documented HTTP clients for OpenSwarm and Cognithor, loopback-only by default, bounded timeouts, explicit per-call approval required for task dispatch.
- [Adapter tests](adapters/agent-adapters.test.cjs)
- [Integration registry](adapters/registry.cjs) — manifest reader, local service probes, bounded task-envelope validation.
- [Registry tests](adapters/registry.test.cjs)

The adapters have contract tests with mocked responses; they have **not** yet completed live end-to-end dispatch because the OpenSwarm and Cognithor runtimes are not running on this PC. OpenSwarm's default host port is 18767 because 8765 is already used by the existing QuantumSolver server and 18766 by the HeavenzFire device bridge. OpenSwarm's container port remains 8765; map host 18767 to container 8765 when deploying it. Cognithor defaults to 8741.

The clients do not install or start either upstream runtime. Remote endpoints are blocked unless `HEAVENZFIRE_ALLOW_REMOTE_AGENT_ENDPOINTS=1` is deliberately configured after a network-boundary review. OpenSwarm dispatch also requires `OPENSWARM_API_KEY`. SOMI remains excluded from code integration until its license/permission status is clarified.

Run the contract suite from the local Integrations folder:

```powershell
node --test adapter-server.test.cjs adapters/registry.test.cjs adapters/agent-adapters.test.cjs
```

## Upstream projects

- [OpenSwarm fork](https://github.com/HeavenzFire/openswarm) — MIT, early alpha.
- [Cognithor fork](https://github.com/HeavenzFire/cognithor) — Apache-2.0, pre-v1.0 beta.
- [SOMI fork](https://github.com/HeavenzFire/Somi) — no license detected; permission/license clarification required before copying, modifying, or redistributing source.

The upstream projects are not merged into n8n core. They remain isolated snapshots/forks behind adapters until API compatibility, dependencies, security posture, and live tests pass.

## Runtime status

As of 2026-10-22, n8n at `http://127.0.0.1:5678/healthz` did not respond. The workflow has been committed and structurally validated but has not been imported or executed by a live n8n instance. Gemini OAuth/live inference and distributed recovery are separate acceptance gates.
