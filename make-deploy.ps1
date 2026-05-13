# Gativus - Automated Deployment Packaging Script
$ErrorActionPreference = "Stop"

$distDir = "dist_deploy"
$zipName = "deploy_full.zip"

$distDir = "dist_deploy"
$zipName = "deploy_full.zip"

Write-Host "--- Step 1: Preparing distribution folder ---" -ForegroundColor Cyan
if (Test-Path $distDir) { 
    Write-Host "[ .. ] Cleaning old dist folder..."
    Remove-Item -Recurse -Force $distDir 
}
New-Item -ItemType Directory -Path $distDir | Out-Null

# 1. Copy Server Code (Flattening .output, EXCLUDING node_modules)
if (Test-Path ".output/server") {
    $targetServer = "$distDir/server"
    New-Item -ItemType Directory -Path $targetServer -Force | Out-Null
    # Копируем всё, КРОМЕ папки node_modules
    Get-ChildItem -Path ".output/server" -Exclude "node_modules" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $targetServer -Recurse -Force
    }
    Write-Host "[ OK ] Copied server bundle (clean, no node_modules)" -ForegroundColor Green
}

# 2. Copy Public Assets (Merging to root public folder)
if (Test-Path ".output/public") {
    $targetPublic = "$distDir/public"
    New-Item -ItemType Directory -Path $targetPublic -Force | Out-Null
    Copy-Item -Path ".output/public/*" -Destination $targetPublic -Recurse -Force
    Write-Host "[ OK ] Copied public assets to root /public folder" -ForegroundColor Green
}

# 3. Copy Entry Point Wrapper
if (Test-Path "app.js") {
    Copy-Item -Path "app.js" -Destination "$distDir/app.js"
} else {
    # Generate app.js if missing
    $appJsContent = @"
const path = require('path');
process.chdir(__dirname); 
async function start() {
    await import('./server/index.mjs');
}
start().catch(err => console.error(err));
"@
    Set-Content -Path "$distDir/app.js" -Value $appJsContent
    Write-Host "[ OK ] Generated app.js wrapper" -ForegroundColor Green
}

# 4. Copy Database
if (Test-Path ".data") {
    $targetData = "$distDir/.data"
    New-Item -ItemType Directory -Path $targetData -Force | Out-Null
    Copy-Item -Path ".data/*" -Destination $targetData -Recurse -Force
    Write-Host "[ OK ] Included database (.data)" -ForegroundColor Green
}

# 5. Generate Production package.json (Safe Merge + Overrides)
$rootPkg = Get-Content "package.json" | ConvertFrom-Json
$nitroPkgPath = ".output/server/package.json"

if (Test-Path $nitroPkgPath) {
    Write-Host "--- Optimizing Production Dependencies ---" -ForegroundColor Yellow
    $nitroPkg = Get-Content $nitroPkgPath | ConvertFrom-Json
    $prodDeps = $nitroPkg.dependencies
    
    if ($rootPkg.dependencies) {
        foreach ($prop in $rootPkg.dependencies.PSObject.Properties) {
            $name = $prop.Name
            if ($name -eq "nuxt" -or $name -match "tailwind") { continue }
            if ($null -eq $prodDeps.PSObject.Properties[$name]) {
                $prodDeps | Add-Member -MemberType NoteProperty -Name $name -Value $prop.Value
            }
        }
    }
    $rootPkg.dependencies = $prodDeps

    # FORCE version consistency via overrides (Fixes ERESOLVE)
    $overrides = ([PSCustomObject]@{
        "vue" = $prodDeps.vue
        "@vue/server-renderer" = $prodDeps."@vue/server-renderer"
    })
    $rootPkg | Add-Member -MemberType NoteProperty -Name "overrides" -Value $overrides -Force

    # Align shiki versions directly in dependencies (overrides can't target direct deps)
    $shikiVersion = $prodDeps."@shikijs/markdown-it"
    if ($prodDeps.PSObject.Properties["shiki"]) {
        $prodDeps.PSObject.Properties["shiki"].Value = $shikiVersion
    }
    if ($prodDeps.PSObject.Properties["@shikijs/core"]) {
        $prodDeps.PSObject.Properties["@shikijs/core"].Value = $shikiVersion
    }
    Write-Host "[ OK ] Aligned shiki+@shikijs/core to $shikiVersion in dependencies" -ForegroundColor Green
}

# Clean up properties for production
$propsToRemove = @("type", "devDependencies", "scripts")
foreach ($propName in $propsToRemove) {
    if ($rootPkg.PSObject.Properties.Match($propName)) {
        $rootPkg.PSObject.Properties.Remove($propName)
        Write-Host "[ OK ] Removed '$propName' for server compatibility" -ForegroundColor Green
    }
}

$rootPkg | ConvertTo-Json -Depth 20 | Set-Content "$distDir/package.json"
Write-Host "[ OK ] Prepared clean production package.json" -ForegroundColor Green

# 6. Generate .npmrc to force install
$npmrcContent = "legacy-peer-deps=true`nengine-strict=false"
Set-Content -Path "$distDir/.npmrc" -Value $npmrcContent
Write-Host "[ OK ] Generated .npmrc" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "DONE! Folder ready: $distDir" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "1. Go to '$distDir' folder."
Write-Host "2. ZIP its content manually (or upload files directly)."
Write-Host "3. ON THE SERVER: Delete 'node_modules' and 'package-lock.json' first!"
Write-Host "4. Extract files and click 'Run NPM Install'."
