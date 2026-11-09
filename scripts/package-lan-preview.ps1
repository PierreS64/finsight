param(
    [string]$Version = '1.0.0-rc.1',
    [Parameter(Mandatory)][string]$ApiHost
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$apk = Join-Path $root 'frontend/mobile/android/app/build/outputs/apk/release/app-release.apk'
$jar = Join-Path $root 'backend/target/finsight-api-0.1.0-SNAPSHOT.jar'
$web = Join-Path $root 'frontend/web/dist'
$bundle = Join-Path $root 'frontend/mobile/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle'
foreach ($path in @($apk, $jar, $bundle, (Join-Path $web 'index.html'))) {
    if (-not (Test-Path -LiteralPath $path)) { throw "Missing build output: $path" }
}
$bundleText = [Text.Encoding]::Latin1.GetString([IO.File]::ReadAllBytes($bundle))
if (-not $bundleText.Contains("${ApiHost}:8086")) {
    throw "Android bundle does not contain the requested LAN API host $ApiHost. Rebuild it first."
}
$buildTools = Join-Path $env:ANDROID_HOME 'build-tools/35.0.0'
$signer = Join-Path $buildTools 'apksigner.bat'
if (-not (Test-Path -LiteralPath $signer)) { throw "Missing Android apksigner: $signer" }
& $signer verify $apk
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed' }

$releaseRoot = Join-Path $root '.secrets/releases'
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$stage = Join-Path $releaseRoot "FinSight-$Version-LAN"
$zip = "$stage.zip"
if ((Test-Path -LiteralPath $stage) -or (Test-Path -LiteralPath $zip)) {
    throw "Release output already exists: $stage"
}
New-Item -ItemType Directory -Path $stage | Out-Null
Copy-Item -LiteralPath $apk -Destination (Join-Path $stage 'FinSight-Android.apk')
Copy-Item -LiteralPath $jar -Destination (Join-Path $stage 'finsight-api.jar')
Copy-Item -LiteralPath $web -Destination (Join-Path $stage 'web') -Recurse
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'release/start-api.ps1') -Destination $stage
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'release/start-web.ps1') -Destination $stage
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'release/serve-web.mjs') -Destination $stage
$head = (git -C $root rev-parse --short HEAD).Trim()
@"
# FinSight $Version — LAN preview

Source commit: $head
Android API URL baked into APK: http://${ApiHost}:8086

This package contains a signed Android APK, a Spring Boot API JAR and a static web build. It contains no .env, database password, OpenAI key, signing key or user data.

1. Keep the PC on a private Wi-Fi network with IPv4 $ApiHost. Connect the Android phone to the same network. If the PC address changes, rebuild the APK with the new API URL.
2. Place a private `.env` beside `start-api.ps1`, or pass its existing path with `-EnvFile`. Never share that file with the release ZIP.
3. In one PowerShell terminal run `powershell -ExecutionPolicy Bypass -File .\start-api.ps1 -EnvFile D:\Codes\finsight\.env`. Check `http://${ApiHost}:8086/actuator/health` on the phone. Allow inbound TCP 8086 on the Windows Private network if the phone cannot connect.
4. In a second terminal run `powershell -ExecutionPolicy Bypass -File .\start-web.ps1`. Open `http://127.0.0.1:5173/` on the PC. Node.js is required for this static server.
5. Install `FinSight-Android.apk` on Android. The release build embeds its JavaScript; Metro, Expo Go, USB reverse, Docker and WSL are not required.
6. Stop both foreground processes with Ctrl+C. No WSL service is started by these scripts.

This is a private LAN preview, not a public Internet deployment or Google Play release. Keep the local release signing key backed up separately; future APK updates for package `com.finsight.app` must use the same key.
"@ | Set-Content -LiteralPath (Join-Path $stage 'README.md') -Encoding UTF8
$manifest = Get-ChildItem -LiteralPath $stage -File -Recurse | ForEach-Object {
    $relative = [IO.Path]::GetRelativePath($stage, $_.FullName)
    "$(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256 | Select-Object -ExpandProperty Hash)  $relative"
}
$manifest | Set-Content -LiteralPath (Join-Path $stage 'SHA256SUMS.txt') -Encoding ASCII
Compress-Archive -LiteralPath $stage -DestinationPath $zip
Write-Output "Release package: $zip"
Write-Output "SHA-256: $((Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash)"
