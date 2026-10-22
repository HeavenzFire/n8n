# HeavenzFire Unified Field integration assets

This folder contains importable workflow assets for the HeavenzFire fork of n8n. These files do not alter n8n runtime code.

## Guardian health report

Import `unified-field-guardian-health.json` into a self-hosted n8n instance running on the same host/network namespace as HeavenzFire BrowserBridge. The workflow reads `http://127.0.0.1:18795/api/guardian/state`, normalizes service counts and attention state, and is configured for manual execution and a five-minute schedule. It is imported inactive; review it before activation.

**Safety:** read-only. It does not run shell commands, repair services, change repositories, or perform remediation. The current Guardian endpoint has reported `overall=critical`; diagnose that status before considering automation beyond observation.

## Upstream projects tracked separately

- OpenSwarm fork: https://github.com/HeavenzFire/openswarm (MIT)
- Cognithor fork: https://github.com/HeavenzFire/cognithor (Apache-2.0)
- SOMI fork: https://github.com/HeavenzFire/Somi (no license detected; code integration requires permission/license clarification)

The upstream projects are not merged into n8n core. They should be integrated through tested adapters after reviewing API boundaries, dependencies, licenses, and threat models.

## Local runtime note

As of 2026-10-22, `http://127.0.0.1:5678/healthz` did not respond on the user's PC, so the workflow has been prepared for import but has not been executed by a running n8n instance.
