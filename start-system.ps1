# HTVM System Start Script

Write-Host "Starting HTVM Simulation System..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install dependencies if node_modules don't exist
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location frontend
    npm install
    Set-Location ..
}

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

# Create environment file for backend if it doesn't exist
if (-not (Test-Path "backend/.env")) {
    Write-Host "Creating backend environment file..." -ForegroundColor Yellow
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "Please edit backend/.env with your MongoDB URL and other settings" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "HTVM System Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the system:" -ForegroundColor Cyan
Write-Host "1. Open two terminals" -ForegroundColor White
Write-Host "2. In first terminal: cd backend && npm run dev" -ForegroundColor White
Write-Host "3. In second terminal: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Default login credentials:" -ForegroundColor Yellow
Write-Host "Username: conductor001" -ForegroundColor White
Write-Host "Password: demo123" -ForegroundColor White
Write-Host ""
Write-Host "Frontend will run on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend will run on: http://localhost:5000" -ForegroundColor Cyan
