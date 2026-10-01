# Build the responsive tiers the gallery uses.
#
#   powershell -ExecutionPolicy Bypass -File tools\make-image-variants.ps1
#
# Reads  assets\gallery\photo-NN.jpg        (the 1600px originals, never modified)
# Writes assets\gallery\photo-NN-720.jpg
#        assets\gallery\photo-NN-1200.jpg
#
# js\main.js lists all three in `srcset`, so the browser downloads the smallest
# file that covers the slot: ~720px for a phone carousel slide, and 1600px only
# for a full-screen lightbox. Photos already smaller than a tier are skipped
# rather than upscaled. Safe to re-run: every variant is rewritten in place.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root    = Split-Path -Parent $PSScriptRoot
$dir     = Join-Path $root "assets\gallery"
$tiers   = @(720, 1200)
$quality = 80L

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
         Where-Object { $_.MimeType -eq "image/jpeg" }
if (-not $codec) { throw "no JPEG encoder found" }

$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
  [System.Drawing.Imaging.Encoder]::Quality, $quality)

function Get-JpegBlock([System.Drawing.Bitmap]$bmp) {
  $ms = New-Object System.IO.MemoryStream
  $bmp.Save($ms, $codec, $ep)
  $bytes = $ms.ToArray()
  $ms.Dispose()
  return $bytes
}

$srcFiles = Get-ChildItem -LiteralPath $dir -File |
            Where-Object { $_.Name -match '^photo-\d\d\.jpg$' } |
            Sort-Object Name
if ($srcFiles.Count -eq 0) { throw "no photo-NN.jpg found in $dir" }

$origTotal = 0
$made      = @{}
foreach ($t in $tiers) { $made[$t] = @{ Count = 0; Bytes = 0 } }

Write-Output ("source photos : {0}" -f $srcFiles.Count)
Write-Output ""

foreach ($f in $srcFiles) {
  $origTotal += $f.Length
  $img = [System.Drawing.Image]::FromFile($f.FullName)
  try {
    $w = $img.Width
    $h = $img.Height
    $long = [Math]::Max($w, $h)

    foreach ($t in $tiers) {
      # Never upscale: a photo already smaller than the tier keeps no variant
      # at that tier, and srcset simply omits the candidate.
      if ($long -le $t) { continue }

      $scale = $t / $long
      $nw = [int][Math]::Round($w * $scale)
      $nh = [int][Math]::Round($h * $scale)

      $bmp = New-Object System.Drawing.Bitmap($nw, $nh)
      try {
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
          $g.DrawImage($img, 0, 0, $nw, $nh)
        } finally { $g.Dispose() }

        $out = Join-Path $dir ("{0}-{1}.jpg" -f $f.BaseName, $t)
        $bytes = Get-JpegBlock $bmp
        [System.IO.File]::WriteAllBytes($out, $bytes)

        $made[$t].Count++
        $made[$t].Bytes += $bytes.Length
        Write-Output ("  {0,-22} {1,4}x{2,-4}  {3,7:N0} B" -f `
          ("{0}-{1}.jpg" -f $f.BaseName, $t), $nw, $nh, $bytes.Length)
      } finally { $bmp.Dispose() }
    }
  } finally { $img.Dispose() }
}

Write-Output ""
Write-Output ("originals     : {0} files, {1:N0} B ({2:N2} MB)" -f `
  $srcFiles.Count, $origTotal, ($origTotal / 1MB))
foreach ($t in $tiers) {
  $m = $made[$t]
  Write-Output ("{0,4}px tier   : {1} files, {2:N0} B ({3:N2} MB)" -f `
    $t, $m.Count, $m.Bytes, ($m.Bytes / 1MB))
}
