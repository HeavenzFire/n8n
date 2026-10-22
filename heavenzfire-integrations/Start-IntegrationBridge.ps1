$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 18790
$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
  try { $health = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/health') -TimeoutSec 2; if ($health.service -eq 'heavenzfire-integration-bridge') { Write-Output 'Integration bridge already running.'; exit 0 } } catch {}
  throw ('Port ' + $port + ' is occupied by another service. Refusing to replace it.')
}
$node = (Get-Command node -ErrorAction Stop).Source
$process = Start-Process -FilePath $node -ArgumentList @((Join-Path $root 'adapter-server.cjs')) -WorkingDirectory $root -WindowStyle Hidden -PassThru
Start-Sleep -Milliseconds 700
try { $health = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $port + '/health') -TimeoutSec 3; if ($health.service -ne 'heavenzfire-integration-bridge') { throw 'Unexpected service answered on integration port.' }; Write-Output ('STARTED PID=' + $process.Id); $health | ConvertTo-Json -Depth 4 } catch { throw ('Integration bridge did not become healthy: ' + $_.Exception.Message) }


[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
