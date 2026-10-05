# PowerShell Script to Generate Google Play Store Production Keystore
# Run this script once to create your release-key.jks file.

param (
    [string]$KeyStoreName = "release-key.jks",
    [string]$KeyAlias = "uppolicekey",
    [string]$StorePass = "",
    [string]$DName = "CN=UP Police Directory, OU=Telecommunication, O=Uttar Pradesh Police, L=Lucknow, ST=Uttar Pradesh, C=IN"
)

$targetDir = Join-Path $PSScriptRoot "..\android"
$keystorePath = Join-Path $targetDir $KeyStoreName
$propsPath = Join-Path $targetDir "keystore.properties"

if (Test-Path $keystorePath) {
    Write-Host "Keystore already exists at: $keystorePath" -ForegroundColor Yellow
    exit 0
}

# Find keytool in PATH or Android Studio / Java directories
$keytool = Get-Command "keytool" -ErrorAction SilentlyContinue
if (-not $keytool) {
    $possibleJdkPaths = @(
        "$env:JAVA_HOME\bin\keytool.exe",
        "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe",
        "C:\Program Files\Android\Android Studio\jre\bin\keytool.exe",
        "C:\Program Files\Java\jdk*\bin\keytool.exe",
        "C:\Program Files\Eclipse Adoptium\jdk*\bin\keytool.exe"
    )
    foreach ($p in $possibleJdkPaths) {
        $found = Get-Item $p -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            $keytool = $found.FullName
            break
        }
    }
} else {
    $keytool = $keytool.Source
}

if (-not $keytool) {
    Write-Host "ERROR: 'keytool' not found. Please install Android Studio or JDK (Java 17/21)." -ForegroundColor Red
    Write-Host "You can also generate the keystore in Android Studio via Build -> Generate Signed Bundle / APK" -ForegroundColor Cyan
    exit 1
}

if ([string]::IsNullOrWhiteSpace($StorePass)) {
    $StorePass = Read-Host "Enter a strong password for your Keystore" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($StorePass)
    $StorePass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

Write-Host "Generating 2048-bit RSA Keystore at: $keystorePath..." -ForegroundColor Cyan

& "$keytool" -genkeypair -v `
    -keystore "$keystorePath" `
    -alias "$KeyAlias" `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000 `
    -storepass "$StorePass" `
    -keypass "$StorePass" `
    -dname "$DName"

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS: Keystore created successfully!" -ForegroundColor Green

    # Create android/keystore.properties
    $propsContent = @"
storeFile=$KeyStoreName
storePassword=$StorePass
keyAlias=$KeyAlias
keyPassword=$StorePass
"@
    Set-Content -Path $propsPath -Value $propsContent -Encoding UTF8
    Write-Host "Created $propsPath with your credentials." -ForegroundColor Green
    Write-Host "Keep this key file and password SAFE and BACKED UP. If lost, you cannot update your app on Play Store!" -ForegroundColor Yellow
} else {
    Write-Host "Failed to generate keystore." -ForegroundColor Red
}
