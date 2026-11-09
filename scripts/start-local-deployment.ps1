param([switch]$IncludeCI, [int]$StartupTimeoutSeconds = 180)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root '.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw 'Create the ignored root .env before starting the local deployment.' }

function Test-DockerEngine {
    $ErrorActionPreference = 'SilentlyContinue'
    & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

if (-not (Test-DockerEngine)) {
    & docker desktop start --detach
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop could not start.' }
}

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
do {
    if (Test-DockerEngine) { break }
    if ((Get-Date) -ge $deadline) { throw 'Docker Desktop did not become ready in time.' }
    Start-Sleep -Seconds 2
} while ($true)

Push-Location $root
try {
    & docker compose --env-file $envFile -f compose.demo.yaml up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'FinSight Compose deployment failed.' }
    if ($IncludeCI) {
        & docker compose -f infrastructure/docker/compose.sonar.yaml up -d
        if ($LASTEXITCODE -ne 0) { throw 'SonarQube could not start.' }
        & powershell -ExecutionPolicy Bypass -File scripts/start-jenkins-local.ps1 -StartupTimeoutSeconds $StartupTimeoutSeconds
        if ($LASTEXITCODE -ne 0) { throw 'Jenkins could not start.' }
    }
} finally {
    Pop-Location
}

Write-Host 'FinSight web http://127.0.0.1:5173  API http://127.0.0.1:8086/actuator/health'
Write-Host 'Prometheus http://127.0.0.1:9090  Grafana http://127.0.0.1:3001/d/finsight-api/finsight-api'
if ($IncludeCI) { Write-Host 'Jenkins http://127.0.0.1:8085  SonarQube http://127.0.0.1:9000' }
