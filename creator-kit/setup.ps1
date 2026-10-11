param([switch]$ApproveInstall)
$ErrorActionPreference = 'Stop'
function Run-Checked([string]$Exe, [string[]]$Arguments) {
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Command failed: $Exe (exit $LASTEXITCODE)" }
}
Write-Host 'Checking NVIDIA GPU and local tools. No administrator access required.'
Run-Checked 'nvidia-smi' @('--query-gpu=name,memory.total,driver_version','--format=csv')
foreach ($tool in @('git','python')) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "Install $tool from its official publisher, reopen your terminal, then retry."
    }
}
Run-Checked 'python' @('-c','import sys; assert sys.version_info[:2] == (3,12), "Use Python 3.12 for this setup"')
if (-not $ApproveInstall) {
    Write-Host 'Checks passed. Review CLAUDE.md, then authorize setup.ps1 -ApproveInstall to clone ComfyUI and install packages.'
    exit 0
}
$Comfy = Join-Path $PSScriptRoot 'runtime\ComfyUI'
if (-not (Test-Path $Comfy)) {
    New-Item -ItemType Directory -Force (Split-Path $Comfy) | Out-Null
    Run-Checked 'git' @('clone','https://github.com/Comfy-Org/ComfyUI.git',$Comfy)
} else {
    if (-not (Test-Path (Join-Path $Comfy 'main.py'))) { throw 'Existing runtime folder is not ComfyUI; it was not overwritten.' }
    Write-Host 'Reusing existing ComfyUI; no automatic update.'
}
$Venv = Join-Path $PSScriptRoot 'runtime\venv'
if (-not (Test-Path $Venv)) { Run-Checked 'python' @('-m','venv',$Venv) }
$Py = Join-Path $Venv 'Scripts\python.exe'
# CUDA 12.8 wheels support the RTX 50 series. Verify upstream compatibility before installing.
Run-Checked $Py @('-m','pip','install','torch','torchvision','torchaudio','--index-url','https://download.pytorch.org/whl/cu128')
Run-Checked $Py @('-m','pip','install','-r',(Join-Path $Comfy 'requirements.txt'))
Run-Checked $Py @('-c','import torch; assert torch.cuda.is_available(); x=torch.ones(16,device="cuda"); print(torch.cuda.get_device_name(), x.sum().item())')
Run-Checked 'git' @('-C',$Comfy,'rev-parse','HEAD')
& $Py -m pip freeze | Set-Content (Join-Path $PSScriptRoot 'installed-packages.txt')
if ($LASTEXITCODE -ne 0) { throw 'Could not record installed packages.' }
Write-Host 'ComfyUI installed and CUDA tested. Video models, workflow and voices still require setup by Claude.'
