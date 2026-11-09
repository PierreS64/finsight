param([switch]$StopOtherContainers)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$task = Get-ScheduledTask -TaskName 'FinSight Jenkins Agent' -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') { Stop-ScheduledTask -TaskName 'FinSight Jenkins Agent' }

function Test-DockerEngine {
    $ErrorActionPreference = 'SilentlyContinue'
    & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

if (Test-DockerEngine) {
    Push-Location $root
    try {
        & docker compose -f infrastructure/docker/compose.jenkins.yaml down
        if ($LASTEXITCODE -ne 0) { throw 'Jenkins could not stop.' }
        & docker compose -f infrastructure/docker/compose.sonar.yaml down
        if ($LASTEXITCODE -ne 0) { throw 'SonarQube could not stop.' }
        & docker compose -f compose.demo.yaml down
        if ($LASTEXITCODE -ne 0) { throw 'FinSight demo could not stop.' }
    } finally {
        Pop-Location
    }
    $remaining = @(& docker ps -q | Where-Object { $_ })
    if ($remaining.Count -gt 0) {
        if (-not $StopOtherContainers) { throw 'Other Docker containers are still running. Pass -StopOtherContainers to stop them before shutting down Docker Desktop and WSL.' }
        & docker stop $remaining | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'At least one other Docker container could not stop.' }
    }
    & docker desktop stop --timeout 60
    if ($LASTEXITCODE -ne 0) { throw 'Docker Desktop did not stop cleanly; WSL was left running.' }
}

& wsl --shutdown
if ($LASTEXITCODE -ne 0) { throw 'WSL did not shut down cleanly.' }
Write-Host 'FinSight containers, Jenkins agent, Docker Desktop and WSL stopped. Named data volumes remain available for the next demo.'
