param([switch]$Strict)
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$results = New-Object System.Collections.Generic.List[object]
function Add-Result([string]$Name,[string]$State,[string]$Detail) { $results.Add([PSCustomObject]@{Name=$Name;State=$State;Detail=$Detail}) }
foreach ($probe in @(
  @{Name='BrowserBridge';Url='http://127.0.0.1:18795/health'},
  @{Name='UnifiedFieldDashboard';Url='http://127.0.0.1:8800/health'},
  @{Name='LocalInferenceGateway';Url='http://127.0.0.1:11800/health'},
  @{Name='MicroMindSandbox';Url='http://127.0.0.1:11811/api/health'},
  @{Name='Ollama';Url='http://127.0.0.1:11434/api/tags'},
  @{Name='IntegrationBridge';Url='http://127.0.0.1:18790/health'},
  @{Name='n8n';Url='http://127.0.0.1:5678/healthz'}
)) { try { $r=Invoke-WebRequest -Uri $probe.Url -UseBasicParsing -TimeoutSec 3; Add-Result $probe.Name 'PASS' ('HTTP '+[int]$r.StatusCode+' '+$probe.Url) } catch { Add-Result $probe.Name 'WARN' ($probe.Url+' '+$_.Exception.Message) } }
try { $h=Invoke-RestMethod 'http://127.0.0.1:18790/api/integrations/health' -TimeoutSec 8; if($h.overall -eq 'healthy'){Add-Result 'CombinedIntegrationHealth' 'PASS' ('services='+$h.summary.total)}else{Add-Result 'CombinedIntegrationHealth' 'WARN' ('overall='+$h.overall+'; findings='+(@($h.findings) -join '; '))}; foreach($a in $h.services | Where-Object id -in @('openswarm','cognithor')){if($a.state -eq 'healthy'){Add-Result ('Agent '+$a.id) 'PASS' $a.state}else{Add-Result ('Agent '+$a.id) 'WARN' ($a.state+' '+$a.endpoint)}} } catch { Add-Result 'CombinedIntegrationHealth' 'WARN' $_.Exception.Message }
$nodeTests = @('adapter-server.test.cjs','adapters\registry.test.cjs','adapters\agent-adapters.test.cjs') | ForEach-Object { Join-Path $root $_ }
try { & node --test @nodeTests; if($LASTEXITCODE -eq 0){Add-Result 'AdapterContractTests' 'PASS' '21 Node tests passed'}else{Add-Result 'AdapterContractTests' 'FAIL' ('node --test exit '+$LASTEXITCODE)} } catch { Add-Result 'AdapterContractTests' 'FAIL' $_.Exception.Message }
foreach($file in @('adapter-server.cjs','adapters\registry.cjs','adapters\agent-adapters.cjs')) { try { & node --check (Join-Path $root $file); if($LASTEXITCODE -eq 0){Add-Result ('Syntax '+$file) 'PASS' 'node --check'}else{Add-Result ('Syntax '+$file) 'FAIL' ('node --check exit '+$LASTEXITCODE)} } catch { Add-Result ('Syntax '+$file) 'FAIL' $_.Exception.Message } }
try { $w=Get-Content -Raw (Join-Path $root 'n8n\heavenzfire-unified-field-guardian-health.json') | ConvertFrom-Json; $names=@($w.nodes | ForEach-Object name); $targets=@(); foreach($src in $w.connections.PSObject.Properties.Name){foreach($lane in $w.connections.$src.main){foreach($edge in $lane){$targets += $edge.node}}}; $fields=@($w.nodes | Where-Object name -eq 'Summarize Integration Report' | ForEach-Object {$_.parameters.assignments.assignments}); if($w.active -or $w.nodes.Count -ne 4 -or $w.nodes[2].parameters.url -ne 'http://127.0.0.1:18790/api/integrations/health' -or @($names | Select-Object -Unique).Count -ne $names.Count -or @($targets | Where-Object { $names -notcontains $_ }).Count -gt 0 -or $fields.Count -lt 11){throw 'Workflow structure/endpoint/activation gate failed'}; Add-Result 'n8nWorkflowAsset' 'PASS' ('connected to local integration bridge; '+$fields.Count+' report fields; inactive by default') } catch { Add-Result 'n8nWorkflowAsset' 'FAIL' $_.Exception.Message }
foreach($repo in @(@{Name='OpenSwarmSnapshot';Path='upstream\OpenSwarm';License='LICENSE'},@{Name='CognithorSnapshot';Path='upstream\Cognithor';License='LICENSE'})){ $p=Join-Path $root $repo.Path; if((Test-Path (Join-Path $p 'README.md')) -and (Test-Path (Join-Path $p $repo.License))){Add-Result $repo.Name 'PASS' 'README and LICENSE present; isolated source snapshot'}else{Add-Result $repo.Name 'FAIL' ('missing README or LICENSE under '+$p)} }
$results | Format-Table -AutoSize -Wrap
$failures=@($results | Where-Object State -eq 'FAIL').Count; $warnings=@($results | Where-Object State -eq 'WARN').Count
Write-Output ('SUMMARY pass='+@($results | Where-Object State -eq 'PASS').Count+' warn='+$warnings+' fail='+$failures)
if($failures -gt 0 -or ($Strict -and $warnings -gt 0)){exit 1}

[executed on device: ZDH (77b98796-cf81-45a3-96ca-7c08c8e2b595)]
