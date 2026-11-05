$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $root 'infrastructure\docker\compose.jenkins.yaml'
$taskName = 'FinSight Jenkins Agent'

function Test-DockerEngine {
    $ErrorActionPreference = 'SilentlyContinue'
    & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($task -and $task.State -eq 'Running') { Stop-ScheduledTask -TaskName $taskName }

if (-not (Test-DockerEngine)) {
    Write-Host 'Jenkins agent stopped. Docker Desktop is already stopped.'
    return
}

& docker compose -f $composeFile stop
if ($LASTEXITCODE -ne 0) { throw 'Could not stop the Jenkins controller; Docker Desktop was left running.' }

$otherContainerIds = @(& docker ps -q | Where-Object { $_ })
if ($LASTEXITCODE -ne 0) { throw 'Could not check other containers; Docker Desktop was left running.' }
if ($otherContainerIds.Count -gt 0) {
    Write-Host 'Jenkins stopped. Docker Desktop stays open because other containers are running.'
    return
}

& docker desktop stop --timeout 60
if ($LASTEXITCODE -ne 0) { throw 'Jenkins stopped, but Docker Desktop did not stop cleanly.' }
Write-Host 'Jenkins agent, controller, and Docker Desktop stopped.'
