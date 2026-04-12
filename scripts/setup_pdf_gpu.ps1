# One-shot: venv + CUDA PyTorch (cu128) + Chandra for process_pdfs.py
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup_pdf_gpu.ps1
#
# Close other terminals running process_pdfs / Jupyter using this .venv first
# (Windows locks torch DLLs during pip uninstall).

Write-Host "Tip: Close any Python/Jupyter using .venv before continuing.`n" -ForegroundColor Yellow

$Root = Split-Path $PSScriptRoot -Parent
Set-Location $Root
if (-not (Test-Path "requirements-pdf.txt")) {
    Write-Error "Run this script from the repo (requirements-pdf.txt not found in $Root)."
    exit 1
}

$VenvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating .venv ..."
    py -3.12 -m venv .venv 2>$null
    if (-not (Test-Path $VenvPy)) {
        python -m venv .venv
    }
}

Write-Host "Installing CUDA torch + deps (may take several minutes) ..."
& $VenvPy -m pip install -U pip
& $VenvPy -m pip uninstall -y torch torchvision torchaudio 2>$null
# 1) CUDA torch first (cu128 extra index in requirements-pdf.txt)
& $VenvPy -m pip install -r requirements-pdf.txt
# 2) Chandra can upgrade torch to a CPU wheel from PyPI — run requirements again to restore cu128
& $VenvPy -m pip install "chandra-ocr[hf]==0.2.0"
& $VenvPy -m pip install -r requirements-pdf.txt

Write-Host ""
Write-Host "Verifying GPU visibility in this venv:"
& $VenvPy -c @"
import torch
print('torch:', torch.__version__)
print('cuda available:', torch.cuda.is_available())
if torch.cuda.is_available():
    print('device 0:', torch.cuda.get_device_name(0))
"@

Write-Host ""
Write-Host "Run pipeline (GPU, an toan VRAM mac dinh):"
Write-Host "  .\.venv\Scripts\python.exe process_pdfs.py"
Write-Host "Hoac them PDF_CONSERVE_VRAM=1 neu van bi het VRAM (giam chat luong nhe de doi lay toc do / RAM GPU)."
