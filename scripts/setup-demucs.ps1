# Quick setup for high-quality separation (Demucs) on Windows (PowerShell)
python -m venv .venv_demucs
.\.venv_demucs\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install demucs
Write-Host "Checking demucs..."
demucs --version
Write-Host "OK. You can now run: npm run dev"
