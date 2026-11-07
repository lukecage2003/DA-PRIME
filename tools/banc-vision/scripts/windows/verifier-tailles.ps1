# Étape 0 — Lire les TAILLES RÉELLES et les licences des fichiers candidats, SANS rien télécharger (métadonnées seulement).
# Usage (PowerShell) :  .\verifier-tailles.ps1 > tailles.txt
# Ne transmet aucune donnée personnelle ni aucun comic : simple lecture de l'API publique de Hugging Face.
$depots = @(
  'Qwen/Qwen3-VL-8B-Instruct-GGUF', 'unsloth/Qwen3-VL-8B-Instruct-GGUF',
  'Qwen/Qwen3-VL-30B-A3B-Instruct-GGUF', 'unsloth/Qwen3-VL-30B-A3B-Instruct-GGUF',
  'ggml-org/InternVL3-14B-Instruct-GGUF',
  'unsloth/Qwen3.5-9B-GGUF', 'Qwen/Qwen3.5-9B',
  'openbmb/MiniCPM-V-4.7-35B-A3B-gguf', 'ggml-org/gemma-4-26B-A4B-it-GGUF'
)
foreach ($d in $depots) {
  Write-Output "=== $d"
  try {
    $info = Invoke-RestMethod -Uri "https://huggingface.co/api/models/$d" -TimeoutSec 30
    Write-Output ("licence (fiche) : " + ($info.cardData.license) + " · dernière modification : " + $info.lastModified)
    $arbre = Invoke-RestMethod -Uri "https://huggingface.co/api/models/$d/tree/main" -TimeoutSec 30
    $arbre | Where-Object { $_.path -match '\.gguf$' -or $_.path -match 'LICENSE' } | ForEach-Object {
      Write-Output ("  {0,-70} {1,8:N2} Go" -f $_.path, ($_.size / 1GB))
    }
  } catch { Write-Output "  introuvable ou inaccessible : $($_.Exception.Message)" }
}
