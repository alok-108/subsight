# SUBSIGHT Local Development Bootstrapper (PowerShell)
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "         BOOTING SUBSIGHT FULL-STACK    " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"
$PythonExe = Join-Path $BackendDir "venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "[!] Virtual environment not found. Creating backend/venv..." -ForegroundColor Yellow
    python -m venv (Join-Path $BackendDir "venv")
    & $PythonExe -m pip install -r (Join-Path $BackendDir "requirements.txt")
}

Write-Host "[*] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$backendJob = Start-Process -FilePath $PythonExe -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $BackendDir -PassThru

Write-Host "[*] Starting Next.js Frontend on http://localhost:3000..." -ForegroundColor Green
$frontendJob = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev" -WorkingDirectory $FrontendDir -PassThru

Write-Host "`n✓ SUBSIGHT is running!" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host "`nPress Ctrl+C or close this window to stop both servers." -ForegroundColor Yellow

try {
    Wait-Process -Id $frontendJob.Id, $backendJob.Id
} finally {
    Stop-Process -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $frontendJob.Id -ErrorAction SilentlyContinue
}
