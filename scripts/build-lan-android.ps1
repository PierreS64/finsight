param([Parameter(Mandatory)][string]$ApiHost, [string]$FallbackApiHost)
$ErrorActionPreference = 'Stop'
$address = $null
if (-not [Net.IPAddress]::TryParse($ApiHost, [ref]$address) -or
    $address.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork) {
    throw 'ApiHost must be an IPv4 address reachable from the Android phone.'
}
if ($FallbackApiHost -and (-not [Net.IPAddress]::TryParse($FallbackApiHost, [ref]$address) -or
    $address.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork)) {
    throw 'FallbackApiHost must be an IPv4 address reachable from the Android phone.'
}
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mobile = Join-Path $root 'frontend/mobile'
$native = Join-Path $mobile 'android'
if (Test-Path -LiteralPath $native) {
    $resolved = (Resolve-Path -LiteralPath $native).Path
    if (-not $resolved.StartsWith(($mobile + [IO.Path]::DirectorySeparatorChar), [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Generated Android directory is outside the mobile workspace.'
    }
}
$key = Join-Path $root '.secrets/release-signing/finsight-lan-preview.jks'
$passwordFile = Join-Path $root '.secrets/release-signing/password.txt'
if (-not (Test-Path -LiteralPath $key) -or -not (Test-Path -LiteralPath $passwordFile)) {
    throw 'Local signing material is missing. Restore the ignored keystore and password from your secure backup.'
}
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
if (-not (Test-Path -LiteralPath (Join-Path $env:JAVA_HOME 'bin/java.exe'))) { throw 'JDK 17 is missing.' }
$env:FINSIGHT_LAN_PREVIEW = '1'
$env:FINSIGHT_RELEASE_KEYSTORE_PATH = $key
$env:FINSIGHT_RELEASE_KEYSTORE_PASSWORD = Get-Content -LiteralPath $passwordFile -Raw
$env:EXPO_PUBLIC_API_BASE_URL = "http://${ApiHost}:8086"
if ($FallbackApiHost) { $env:EXPO_PUBLIC_API_FALLBACK_URL = "http://${FallbackApiHost}:8086" }
else { Remove-Item Env:EXPO_PUBLIC_API_FALLBACK_URL -ErrorAction SilentlyContinue }
$env:CI = '1'
Push-Location $mobile
try {
    & npx expo prebuild --platform android --clean --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Expo prebuild failed.' }
    Push-Location $native
    try {
        & .\gradlew.bat :app:assembleRelease --no-daemon
        if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }
    } finally { Pop-Location }
} finally { Pop-Location }
$apk = Join-Path $native 'app/build/outputs/apk/release/app-release.apk'
& (Join-Path $env:ANDROID_HOME 'build-tools/35.0.0/apksigner.bat') verify $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
Write-Output "Signed LAN APK: $apk"
Write-Output "Embedded API URL: $env:EXPO_PUBLIC_API_BASE_URL"
if ($FallbackApiHost) { Write-Output "Embedded fallback API URL: $env:EXPO_PUBLIC_API_FALLBACK_URL" }
