$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $PSScriptRoot
Set-Location $scriptRoot
& node .\src\refresh.js
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
