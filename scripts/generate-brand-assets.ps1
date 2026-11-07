$ErrorActionPreference = 'Stop'

# The two tracked mobile assets are exact copies of the approved design logos.
# Sync their platform variants without drawing a different mark.
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$mobileAssets = Join-Path $root 'frontend/mobile/assets'
$webAssets = Join-Path $root 'frontend/web/public'
$fullLogo = Join-Path $mobileAssets 'full-logo.png'
$icon = Join-Path $mobileAssets 'icon.png'

foreach ($source in @($fullLogo, $icon)) {
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Missing canonical logo asset: $source"
  }
}

Copy-Item -LiteralPath $fullLogo -Destination (Join-Path $webAssets 'finsight-logo.png') -Force
Copy-Item -LiteralPath $icon -Destination (Join-Path $webAssets 'finsight-icon.png') -Force
Copy-Item -LiteralPath $fullLogo -Destination (Join-Path $mobileAssets 'splash-icon.png') -Force
Copy-Item -LiteralPath $icon -Destination (Join-Path $mobileAssets 'adaptive-icon.png') -Force
Copy-Item -LiteralPath $icon -Destination (Join-Path $mobileAssets 'favicon.png') -Force
