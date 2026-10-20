param([int]$StartupTimeoutSeconds = 180)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $root 'infrastructure\docker\compose.jenkins.yaml'
$taskName = 'FinSight Jenkins Agent'

function Test-DockerEngine {
    $ErrorActionPreference = 'SilentlyContinue'
    & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

if (-not (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue)) {
    throw "Missing Windows scheduled task '$taskName'."
}

if (-not (Test-DockerEngine)) {
    Write-Host 'Starting Docker Desktop...'
    & docker desktop start --detach
    if ($LASTEXITCODE -ne 0) { throw 'Could not start Docker Desktop.' }
}

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
do {
    if (Test-DockerEngine) { break }
    if ((Get-Date) -ge $deadline) { throw "Docker Desktop did not become ready within $StartupTimeoutSeconds seconds." }
    Start-Sleep -Seconds 2
} while ($true)

& docker compose -f $composeFile up -d
if ($LASTEXITCODE -ne 0) { throw 'Could not start the Jenkins controller.' }

$task = Get-ScheduledTask -TaskName $taskName
if ($task.State -ne 'Running') { Start-ScheduledTask -TaskName $taskName }
Write-Host 'Jenkins is starting at http://127.0.0.1:8085/. The Windows agent may take a moment to connect.'
