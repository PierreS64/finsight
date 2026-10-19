param([int]$Port = 8086)

$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $root '.env'
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Copy .env.example and fill the Supabase values locally."
}

Get-Content -LiteralPath $envFile -Encoding UTF8 | ForEach-Object {
    $line = $_
    if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { return }
    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { return }
    $name = $line.Substring(0, $separator).Trim()
    $value = $line.Substring($separator + 1)
    [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

foreach ($name in @('DATABASE_URL', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'SUPABASE_ISSUER_URI', 'SUPABASE_JWKS_URI')) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        throw "Missing $name in .env"
    }
}

$jdk = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
if (-not (Test-Path -LiteralPath (Join-Path $jdk 'bin\java.exe'))) {
    throw "JDK 17 was not found at $jdk. Update the path in this script."
}
$env:JAVA_HOME = $jdk
$env:SPRING_PROFILES_ACTIVE = 'supabase'
$env:SERVER_PORT = "$Port"
Push-Location (Join-Path $root 'backend')
try {
    & .\mvnw.cmd spring-boot:run
} finally {
    Pop-Location
}
