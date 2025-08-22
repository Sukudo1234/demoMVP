
# Enhance Audio – local dev

This project includes a high-quality **Enhance Audio** tool.

## Quick start

1. **Install Node 18+** and **Python 3.9+**.
2. (Recommended) Install the Demucs separator for best results:
   - macOS/Linux: `./scripts/setup-demucs.sh`
   - Windows (PowerShell): `./scripts/setup-demucs.ps1`
   - Or manually: `pip install demucs`
   - Verify: `demucs --version`
3. Install deps: `npm install`
4. Run: `npm run dev` and open the Enhance Audio tool.

## Modes

- **Quality vs speed**:
  - **Fast/Balanced** → fast FFmpeg chain (denoise, de-ess, HPF, loudness).
  - **Max** → uses **Demucs** to *separate Vocals and Background*; advanced options apply **only to vocals**, then we re-mix to your settings.

## Previews

Preview sliders are instant (client-side) using a safe approximation. For export, the server re-renders at higher quality (especially in **Max**).

