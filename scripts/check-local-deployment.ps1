$ErrorActionPreference = 'Stop'

function Get-Status([string]$url) {
    try { return [int](Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15).StatusCode }
    catch { return [int]$_.Exception.Response.StatusCode }
}

if ((Get-Status 'http://127.0.0.1:8086/actuator/health') -ne 200) { throw 'API health is not 200.' }
if ((Get-Status 'http://127.0.0.1:5173/') -ne 200) { throw 'Web is not 200.' }
if ((Get-Status 'http://127.0.0.1:8086/api/profile') -ne 401) { throw 'Protected API did not return 401 without JWT.' }

$metrics = (Invoke-WebRequest 'http://127.0.0.1:8086/actuator/prometheus' -UseBasicParsing -TimeoutSec 15).Content
if ($metrics -notmatch 'jvm_memory_used_bytes') { throw 'Prometheus metrics are missing JVM data.' }

$deadline = (Get-Date).AddSeconds(60)
do {
    $query = Invoke-RestMethod 'http://127.0.0.1:9090/api/v1/query?query=up%7Bjob%3D%22finsight-api%22%7D' -TimeoutSec 15
    if ($query.data.result.Count -gt 0 -and $query.data.result[0].value[1] -eq '1') { break }
    if ((Get-Date) -ge $deadline) { throw 'Prometheus target finsight-api did not become UP.' }
    Start-Sleep -Seconds 3
} while ($true)

$dashboards = Invoke-RestMethod 'http://127.0.0.1:3001/api/search?query=FinSight' -TimeoutSec 15
if (-not ($dashboards | Where-Object uid -eq 'finsight-api')) { throw 'Grafana FinSight API dashboard was not provisioned.' }

Write-Host 'Local deployment verified: API/web 200, protected route 401, JVM metrics, Prometheus UP, Grafana dashboard.'
