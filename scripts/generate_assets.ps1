Add-Type -AssemblyName System.Drawing

$baseDir = "android\app\src\main\res"

function Draw-PoliceIcon {
    param(
        [int]$size,
        [bool]$isRound = $false,
        [bool]$isForegroundOnly = $false
    )

    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $cNavyBg = [System.Drawing.Color]::FromArgb(7, 14, 28)
    $cGoldBorder = [System.Drawing.Color]::FromArgb(196, 151, 86)
    $cGoldLight = [System.Drawing.Color]::FromArgb(245, 224, 163)
    $cPoliceRed = [System.Drawing.Color]::FromArgb(153, 27, 27)
    $cPoliceBlue = [System.Drawing.Color]::FromArgb(11, 28, 61)
    $cBannerDark = [System.Drawing.Color]::FromArgb(30, 41, 59)

    if (-not $isForegroundOnly) {
        if ($isRound) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $brushBg = New-Object System.Drawing.SolidBrush $cNavyBg
            $g.FillEllipse($brushBg, 0, 0, $size, $size)
            $borderW = [float][Math]::Max(1.5, $size * 0.03)
            $penBorder = New-Object System.Drawing.Pen $cGoldBorder, $borderW
            $g.DrawEllipse($penBorder, 1, 1, ($size - 2), ($size - 2))
        } else {
            $g.Clear($cNavyBg)
            $borderW = [float][Math]::Max(1.5, $size * 0.025)
            $penBorder = New-Object System.Drawing.Pen $cGoldBorder, $borderW
            $g.DrawRectangle($penBorder, 1, 1, ($size - 2), ($size - 2))
        }
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
    }

    # Shield dimensions
    $cx = [float]($size / 2.0)
    $cy = [float]($size / 2.0)
    $scale = [float]($size / 100.0)

    # Draw Shield
    $shieldW = [float](60.0 * $scale)
    $shieldH = [float](70.0 * $scale)
    $sx = [float]($cx - ($shieldW / 2.0))
    $sy = [float]($cy - ($shieldH / 2.0) - (2.0 * $scale))

    $pathShield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pt1 = New-Object System.Drawing.PointF ($cx), ($sy)
    $pt2 = New-Object System.Drawing.PointF ($sx + $shieldW), ($sy + 6.0 * $scale)
    $pt3 = New-Object System.Drawing.PointF ($sx + $shieldW), ($sy + 45.0 * $scale)
    $pt4 = New-Object System.Drawing.PointF ($cx), ($sy + $shieldH)
    $pt5 = New-Object System.Drawing.PointF ($sx), ($sy + 45.0 * $scale)
    $pt6 = New-Object System.Drawing.PointF ($sx), ($sy + 6.0 * $scale)
    
    $pathShield.AddPolygon([System.Drawing.PointF[]]@($pt1, $pt2, $pt3, $pt4, $pt5, $pt6))

    # Fill Right (Navy)
    $brushNavy = New-Object System.Drawing.SolidBrush $cPoliceBlue
    $g.FillPath($brushNavy, $pathShield)

    # Fill Left (Police Red) using clipping
    $oldClip = $g.Clip
    $leftRect = [System.Drawing.RectangleF]::new(0.0, 0.0, $cx, [float]$size)
    $g.SetClip($leftRect)
    $brushRed = New-Object System.Drawing.SolidBrush $cPoliceRed
    $g.FillPath($brushRed, $pathShield)
    $g.Clip = $oldClip

    # Shield Gold Border
    $penW = [float][Math]::Max(1.0, 3.0 * $scale)
    $penShield = New-Object System.Drawing.Pen $cGoldBorder, $penW
    $g.DrawPath($penShield, $pathShield)

    # Center vertical gold line
    $centerPenW = [float][Math]::Max(1.0, 1.5 * $scale)
    $penCenter = New-Object System.Drawing.Pen $cGoldLight, $centerPenW
    $g.DrawLine($penCenter, [System.Drawing.PointF]::new($cx, $sy), [System.Drawing.PointF]::new($cx, $sy + $shieldH))

    # Center 8-pointed star
    $starR_outer = [float](16.0 * $scale)
    $starR_inner = [float](7.0 * $scale)
    $pathStar = New-Object System.Drawing.Drawing2D.GraphicsPath
    $starPts = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    $starCenterY = [float]($cy - (4.0 * $scale))
    for ($i = 0; $i -lt 16; $i++) {
        $angle = ($i * [Math]::PI / 8.0) - ([Math]::PI / 2.0)
        $r = if ($i % 2 -eq 0) { $starR_outer } else { $starR_inner }
        $px = [float]($cx + ($r * [Math]::Cos($angle)))
        $py = [float]($starCenterY + ($r * [Math]::Sin($angle)))
        $starPts.Add((New-Object System.Drawing.PointF $px, $py))
    }
    $pathStar.AddPolygon($starPts.ToArray())
    $brushGoldStar = New-Object System.Drawing.SolidBrush $cGoldLight
    $g.FillPath($brushGoldStar, $pathStar)

    # Star Center Core Badge
    $coreR = [float](6.0 * $scale)
    $brushCore = New-Object System.Drawing.SolidBrush $cNavyBg
    $g.FillEllipse($brushCore, [float]($cx - $coreR), [float]($starCenterY - $coreR), [float]($coreR * 2.0), [float]($coreR * 2.0))
    $corePenW = [float][Math]::Max(1.0, 1.2 * $scale)
    $penCore = New-Object System.Drawing.Pen $cGoldBorder, $corePenW
    $g.DrawEllipse($penCore, [float]($cx - $coreR), [float]($starCenterY - $coreR), [float]($coreR * 2.0), [float]($coreR * 2.0))

    # Ribbon banner below star
    $bannerW = [float](46.0 * $scale)
    $bannerH = [float](10.0 * $scale)
    $bx = [float]($cx - ($bannerW / 2.0))
    $by = [float]($starCenterY + (16.0 * $scale))
    $brushBanner = New-Object System.Drawing.SolidBrush $cBannerDark
    $g.FillRectangle($brushBanner, $bx, $by, $bannerW, $bannerH)
    $bannerPenW = [float][Math]::Max(1.0, 1.2 * $scale)
    $penBanner = New-Object System.Drawing.Pen $cGoldBorder, $bannerPenW
    $g.DrawRectangle($penBanner, $bx, $by, $bannerW, $bannerH)

    if ($size -ge 72) {
        $fontSize = [float][Math]::Max(5.0, 5.5 * $scale)
        $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $brushText = New-Object System.Drawing.SolidBrush $cGoldLight
        $bannerRect = [System.Drawing.RectangleF]::new($bx, $by, $bannerW, $bannerH)
        $g.DrawString("UP POLICE", $font, $brushText, $bannerRect, $sf)
    }

    $g.Dispose()
    return $bmp
}

# Icon dimensions mapping
$iconDensities = @{
    "mdpi"    = 48
    "hdpi"    = 72
    "xhdpi"   = 96
    "xxhdpi"  = 144
    "xxxhdpi" = 192
}

foreach ($d in $iconDensities.Keys) {
    $sz = $iconDensities[$d]
    $folder = Join-Path $baseDir "mipmap-$d"
    if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }

    # Standard Square Icon
    $ic = Draw-PoliceIcon -size $sz -isRound $false
    $ic.Save((Join-Path $folder "ic_launcher.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $ic.Dispose()

    # Round Adaptive Icon
    $icRound = Draw-PoliceIcon -size $sz -isRound $true
    $icRound.Save((Join-Path $folder "ic_launcher_round.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $icRound.Dispose()

    # Foreground Icon
    $icFg = Draw-PoliceIcon -size $sz -isForegroundOnly $true
    $icFg.Save((Join-Path $folder "ic_launcher_foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $icFg.Dispose()
}

Write-Host "Icons generated across all mipmap densities successfully."

# Splash Screens
$splashDensities = @{
    "drawable"             = @{ w = 480;  h = 800 }
    "drawable-port-mdpi"   = @{ w = 320;  h = 480 }
    "drawable-port-hdpi"   = @{ w = 480;  h = 800 }
    "drawable-port-xhdpi"  = @{ w = 720;  h = 1280 }
    "drawable-port-xxhdpi" = @{ w = 960;  h = 1600 }
    "drawable-port-xxxhdpi"= @{ w = 1280; h = 1920 }
}

foreach ($d in $splashDensities.Keys) {
    $folder = Join-Path $baseDir $d
    if (-not (Test-Path $folder)) { New-Item -ItemType Directory -Path $folder -Force | Out-Null }

    $sw = [float]$splashDensities[$d].w
    $sh = [float]$splashDensities[$d].h
    $bmp = New-Object System.Drawing.Bitmap ([int]$sw), ([int]$sh)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Dark Police Background
    $cBg = [System.Drawing.Color]::FromArgb(7, 14, 28)
    $g.Clear($cBg)

    # Draw Central Icon
    $iconSize = [int]([Math]::Min($sw, $sh) * 0.38)
    $iconBmp = Draw-PoliceIcon -size $iconSize -isRound $false
    $ix = [float](($sw - $iconSize) / 2.0)
    $iy = [float](($sh - $iconSize) / 2.0 - ($sh * 0.05))
    $g.DrawImage($iconBmp, $ix, $iy, [float]$iconSize, [float]$iconSize)
    $iconBmp.Dispose()

    # Texts below emblem
    $cGold = [System.Drawing.Color]::FromArgb(223, 185, 126)
    $cSilver = [System.Drawing.Color]::FromArgb(148, 163, 184)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Near

    $fontSizeTitle = [float][Math]::Max(14.0, $sw * 0.048)
    $fontTitle = [System.Drawing.Font]::new("Arial", $fontSizeTitle, [System.Drawing.FontStyle]::Bold)
    $brushTitle = New-Object System.Drawing.SolidBrush $cGold
    $rectTitle = [System.Drawing.RectangleF]::new(0.0, [float]($iy + $iconSize + ($sh * 0.035)), $sw, [float]($sh * 0.1))
    $g.DrawString("UP POLICE DIRECTORY", $fontTitle, $brushTitle, $rectTitle, $sf)

    $fontSizeSub = [float][Math]::Max(10.0, $sw * 0.024)
    $fontSub = [System.Drawing.Font]::new("Arial", $fontSizeSub, [System.Drawing.FontStyle]::Regular)
    $brushSub = New-Object System.Drawing.SolidBrush $cSilver
    $rectSub = [System.Drawing.RectangleF]::new(0.0, [float]($iy + $iconSize + ($sh * 0.035) + $fontSizeTitle * 1.8), $sw, [float]($sh * 0.1))
    $g.DrawString("OFFICIAL COMMUNICATIONS PORTAL", $fontSub, $brushSub, $rectSub, $sf)

    $g.Dispose()
    $bmp.Save((Join-Path $folder "splash.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

Write-Host "All icons and splash screens generated perfectly!"
