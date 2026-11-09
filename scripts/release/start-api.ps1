param(
    [string]$EnvFile = (Join-Path $PSScriptRoot '.env'),
    [int]$Port = 8086
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $EnvFile)) { throw "Missing configuration: $EnvFile" }
Get-Content -LiteralPath $EnvFile -Encoding UTF8 | ForEach-Object {
    $line = $_
    if (-not $line.Trim() -or $line.TrimStart().StartsWith('#')) { return }
    $separator = $line.IndexOf('=')
    if ($separator -lt 1) { return }
    [Environment]::SetEnvironmentVariable($line.Substring(0, $separator).Trim(), $line.Substring($separator + 1), 'Process')
}
foreach ($name in @('DATABASE_URL', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'SUPABASE_ISSUER_URI', 'SUPABASE_JWKS_URI')) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) { throw "Missing $name in $EnvFile" }
}
$env:SPRING_PROFILES_ACTIVE = 'supabase'
$env:SERVER_PORT = [string]$Port
$env:SERVER_ADDRESS = '0.0.0.0'
$tesseract = 'C:\Program Files\Tesseract-OCR\tesseract.exe'
$tessdata = Join-Path $env:LOCALAPPDATA 'FinSight\tessdata'
if (Test-Path -LiteralPath $tesseract) {
    $env:FINSIGHT_TESSERACT_COMMAND = $tesseract
    if ((Test-Path -LiteralPath (Join-Path $tessdata 'vie.traineddata')) -and
        (Test-Path -LiteralPath (Join-Path $tessdata 'eng.traineddata'))) {
        $env:FINSIGHT_TESSDATA_DIR = $tessdata
        $env:FINSIGHT_OCR_LANGUAGES = 'vie+eng'
    }
}
$java = if ($env:JAVA_HOME -and (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    Join-Path $env:JAVA_HOME 'bin\java.exe'
} else { 'java' }
& $java -jar (Join-Path $PSScriptRoot 'finsight-api.jar')
