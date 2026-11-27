param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$illRoot = Join-Path $root 'assets\illustrations'
$ogRoot = Join-Path $root 'assets\og'
$templateOgPath = Join-Path $ogRoot 'australia-nz.jpg'

if (-not (Test-Path $templateOgPath)) {
  throw "Template OG card not found: $templateOgPath"
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Jpeg {
  param(
    [System.Drawing.Image]$Bitmap,
    [string]$OutPath,
    [long]$Quality
  )
  $enc = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $enc.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $Quality)
  $tmp = "$OutPath.tmp"
  $Bitmap.Save($tmp, $jpegCodec, $enc)
  Move-Item -Force $tmp $OutPath
}

function Resize-JpegCanvas {
  param(
    [string]$SrcPath,
    [string]$DestPath,
    [int]$W,
    [int]$H,
    [long]$Quality
  )
  $srcBytes = [System.IO.File]::ReadAllBytes($SrcPath)
  $ms = New-Object System.IO.MemoryStream(, $srcBytes)
  $src = [System.Drawing.Image]::FromStream($ms)
  try {
    $bmp = New-Object System.Drawing.Bitmap($W, $H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $bg = ([System.Drawing.Bitmap]$src).GetPixel(4, 4)
    $g.Clear($bg)

    $scale = [Math]::Min($W / $src.Width, $H / $src.Height)
    $dw = [int][Math]::Round($src.Width * $scale)
    $dh = [int][Math]::Round($src.Height * $scale)
    $dx = [int][Math]::Floor(($W - $dw) / 2)
    $dy = [int][Math]::Floor(($H - $dh) / 2)
    $g.DrawImage($src, $dx, $dy, $dw, $dh)

    Save-Jpeg -Bitmap $bmp -OutPath $DestPath -Quality $Quality
    $g.Dispose()
    $bmp.Dispose()
  } finally {
    $src.Dispose()
    $ms.Dispose()
  }
}

$tplBytes = [System.IO.File]::ReadAllBytes($templateOgPath)
$tplMs = New-Object System.IO.MemoryStream(, $tplBytes)
$tplBmp = [System.Drawing.Bitmap][System.Drawing.Image]::FromStream($tplMs)
$ogBg = $tplBmp.GetPixel(5, 5)

$folders = Get-ChildItem -Path $illRoot -Directory | Sort-Object Name
$processed = 0

foreach ($dir in $folders) {
  $slug = $dir.Name
  if (-not $Force -and ($slug -eq 'japan' -or $slug -eq 'australia')) { continue }

  $hiPath = Join-Path $dir.FullName 'highlights.jpg'
  if (-not (Test-Path $hiPath)) { continue }

  # 1) Normalize highlights.jpg to 1440x960
  Resize-JpegCanvas -SrcPath $hiPath -DestPath $hiPath -W 1440 -H 960 -Quality 88

  # 2) Generate highlights-960.jpg (960x640)
  $hi960Path = Join-Path $dir.FullName 'highlights-960.jpg'
  Resize-JpegCanvas -SrcPath $hiPath -DestPath $hi960Path -W 960 -H 640 -Quality 85

  # 3) Composite assets/og/<slug>.jpg (1200x630)
  $ogOutPath = Join-Path $ogRoot "$slug.jpg"
  $hiImg = [System.Drawing.Image]::FromFile($hiPath)
  try {
    $og = New-Object System.Drawing.Bitmap(1200, 630)
    $g = [System.Drawing.Graphics]::FromImage($og)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear($ogBg)

    # Copy left NOOR Travel logo panel from australia-nz.jpg
    $logoSrc = New-Object System.Drawing.Rectangle(0, 0, 295, 630)
    $logoDst = New-Object System.Drawing.Rectangle(0, 0, 295, 630)
    $g.DrawImage($tplBmp, $logoDst, $logoSrc, [System.Drawing.GraphicsUnit]::Pixel)

    # Place 3:2 highlights collage cleanly in the right region
    $g.DrawImage($hiImg, 300, 20, 885, 590)

    Save-Jpeg -Bitmap $og -OutPath $ogOutPath -Quality 88
    $g.Dispose()
    $og.Dispose()
  } finally {
    $hiImg.Dispose()
  }

  Write-Output "Generated $slug`: highlights.jpg (1440x960), highlights-960.jpg (960x640), og/$slug.jpg (1200x630)"
  $processed++
}

$tplBmp.Dispose()
$tplMs.Dispose()

if ($processed -eq 0) {
  Write-Output "No new highlights.jpg collages found under assets/illustrations/<tour>/."
}
