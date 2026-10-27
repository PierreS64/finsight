Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'

$assetDirectory = Join-Path $PSScriptRoot '..\frontend\mobile\assets'

function New-BrandImage {
  param([string]$Path, [int]$Size, [double]$MarkFraction, [bool]$Opaque)
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear($(if ($Opaque) { [System.Drawing.Color]::White } else { [System.Drawing.Color]::Transparent }))
  $side = [int]($Size * $MarkFraction)
  $left = [int](($Size - $side) / 2)
  $top = $left
  $radius = [int]($side * 0.23)
  $shape = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $shape.AddArc($left, $top, $radius, $radius, 180, 90)
  $shape.AddArc($left + $side - $radius, $top, $radius, $radius, 270, 90)
  $shape.AddArc($left + $side - $radius, $top + $side - $radius, $radius, $radius, 0, 90)
  $shape.AddArc($left, $top + $side - $radius, $radius, $radius, 90, 90)
  $shape.CloseFigure()
  $navy = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#0f172a'))
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $green = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#34d399'))
  $graphics.FillPath($navy, $shape)
  $graphics.FillRectangle($white, $left + $side * 0.30, $top + $side * 0.25, $side * 0.13, $side * 0.51)
  $graphics.FillRectangle($white, $left + $side * 0.30, $top + $side * 0.25, $side * 0.42, $side * 0.12)
  $graphics.FillRectangle($white, $left + $side * 0.30, $top + $side * 0.44, $side * 0.34, $side * 0.12)
  $graphics.FillEllipse($green, $left + $side * 0.66, $top + $side * 0.66, $side * 0.12, $side * 0.12)
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $green.Dispose(); $white.Dispose(); $navy.Dispose(); $shape.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

New-BrandImage (Join-Path $assetDirectory 'icon.png') 1024 1.0 $true
New-BrandImage (Join-Path $assetDirectory 'adaptive-icon.png') 1024 0.68 $false
New-BrandImage (Join-Path $assetDirectory 'splash-icon.png') 1024 0.68 $false
New-BrandImage (Join-Path $assetDirectory 'favicon.png') 48 1.0 $true
