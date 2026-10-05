# PowerShell Script to Build Production AAB (Android App Bundle) or Testing APK
param (
    [ValidateSet("bundle", "apk", "both")]
    [string]$Target = "bundle"
)

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$androidDir = Join-Path $rootDir "android"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "UP POLICE DIRECTORY - ANDROID BUILD ENGINE" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Build Vite Web Production Assets
Write-Host "`n[Step 1/3] Building Web Production Assets..." -ForegroundColor Cyan
Push-Location $rootDir
try {
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Web build failed!" -ForegroundColor Red
        exit 1
    }

    # 2. Sync with Android Project
    Write-Host "`n[Step 2/3] Syncing Capacitor Android Platform..." -ForegroundColor Cyan
    & npx cap sync android
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Capacitor sync failed!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# 3. Gradle Native Build
Write-Host "`n[Step 3/3] Compiling Native Android Release Package..." -ForegroundColor Cyan
Push-Location $androidDir
try {
    $gradlew = ".\gradlew.bat"
    if (-not (Test-Path $gradlew)) {
        Write-Host "gradlew.bat not found in $androidDir" -ForegroundColor Red
        exit 1
    }

    if ($Target -eq "bundle" -or $Target -eq "both") {
        Write-Host "Building Production AAB (bundleRelease)..." -ForegroundColor Yellow
        & $gradlew bundleRelease
        if ($LASTEXITCODE -eq 0) {
            $aabPath = Join-Path $androidDir "app\build\outputs\bundle\release\app-release.aab"
            if (Test-Path $aabPath) {
                Write-Host "`nSUCCESS: Production AAB Generated!" -ForegroundColor Green
                Write-Host "Path: $aabPath" -ForegroundColor White
                Write-Host "File Size: $((Get-Item $aabPath).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })" -ForegroundColor Cyan
                Write-Host "-> Ready for direct upload to Google Play Console!" -ForegroundColor Green
            }
        } else {
            Write-Host "bundleRelease failed. Note: Ensure Java JDK 17+ or Android Studio is configured." -ForegroundColor Red
        }
    }

    if ($Target -eq "apk" -or $Target -eq "both") {
        Write-Host "Building Test APK (assembleRelease / assembleDebug)..." -ForegroundColor Yellow
        & $gradlew assembleDebug
        if ($LASTEXITCODE -eq 0) {
            $apkPath = Join-Path $androidDir "app\build\outputs\apk\debug\app-debug.apk"
            if (Test-Path $apkPath) {
                Write-Host "`nSUCCESS: Test APK Generated!" -ForegroundColor Green
                Write-Host "Path: $apkPath" -ForegroundColor White
                Write-Host "-> You can install this directly on your Android phone via USB or WhatsApp!" -ForegroundColor Green
            }
        }
    }
} finally {
    Pop-Location
}
