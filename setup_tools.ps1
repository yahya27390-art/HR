$ErrorActionPreference = 'Stop'

# 1. Setup Node.js Portable
$nodeDest = "C:\Users\PC\node-v20"
if (-not (Test-Path $nodeDest)) {
    Write-Host "Downloading Node.js..."
    curl.exe -L "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip" -o "node.zip"
    Write-Host "Extracting Node.js..."
    tar -xf "node.zip" -C "C:\Users\PC"
    Rename-Item "C:\Users\PC\node-v20.18.0-win-x64" "node-v20"
    Remove-Item "node.zip" -Force
}

# 2. Setup MinGit (Portable Git)
$gitDest = "C:\Users\PC\mingit"
if (-not (Test-Path $gitDest)) {
    Write-Host "Downloading MinGit..."
    curl.exe -L "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip" -o "mingit.zip"
    Write-Host "Extracting MinGit..."
    New-Item -ItemType Directory -Path $gitDest -Force | Out-Null
    tar -xf "mingit.zip" -C $gitDest
    Remove-Item "mingit.zip" -Force
}

Write-Host "Adding to User PATH..."
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$newEntries = @("C:\Users\PC\node-v20", "C:\Users\PC\mingit\cmd")
foreach ($entry in $newEntries) {
    if ($userPath -notlike "*$entry*") {
        $userPath = "$entry;$userPath"
    }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")
$env:Path = "$userPath;$env:Path"

Write-Host "Testing tools:"
& "C:\Users\PC\node-v20\node.exe" -v
& "C:\Users\PC\mingit\cmd\git.exe" --version
