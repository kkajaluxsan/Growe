Param(
  [switch]$WhatIf = $true
)

$commands = @(
  'winget install -e --id PHP.PHP',
  'winget install -e --id Composer.Composer'
)

Write-Host "This script installs PHP and Composer via winget."
Write-Host "It does NOT modify your project files."
Write-Host ""

if ($WhatIf) {
  Write-Host "WhatIf mode is ON. Commands that would run:"
  $commands | ForEach-Object { Write-Host "  $_" }
  Write-Host ""
  Write-Host "To actually install, re-run with:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\growe-backend-laravel\scripts\windows-install-php-composer.ps1 -WhatIf:`$false"
  exit 0
}

foreach ($c in $commands) {
  Write-Host "Running: $c"
  iex $c
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $c"
  }
}

Write-Host ""
Write-Host "Done. Close and reopen your terminal, then run:"
Write-Host "  php -v"
Write-Host "  composer --version"

