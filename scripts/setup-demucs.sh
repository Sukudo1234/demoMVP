#!/usr/bin/env bash
# Quick setup for high-quality separation (Demucs) on macOS/Linux
set -e
python3 -m venv .venv_demucs || true
source .venv_demucs/bin/activate
python -m pip install --upgrade pip
pip install demucs
echo "Checking demucs..."
demucs --version
echo "OK. You can now run: npm run dev"
