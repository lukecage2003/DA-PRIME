# Lance llama-server pour UNE configuration du banc (aucun téléchargement : les fichiers doivent déjà être présents).
# Exemple : .\lancer-serveur.ps1 -Poids D:\modeles\Qwen3-VL-8B-Instruct-Q8_0.gguf -Mmproj D:\modeles\mmproj-Qwen3-VL-8B-Instruct-F16.gguf -Config hybride -Couches 8 -Contexte 8192 -JetonsImage 2560
param(
  [Parameter(Mandatory)] [string] $Poids,
  [Parameter(Mandatory)] [string] $Mmproj,
  [ValidateSet('gpu-max', 'hybride', 'cpu', 'moe-experts-ram')] [string] $Config = 'hybride',
  [int] $Couches = 8, [int] $Contexte = 8192, [int] $JetonsImage = 1280, [int] $Port = 8090,
  [string] $Serveur = '.\llama-server.exe'
)
$commun = @('-m', $Poids, '--mmproj', $Mmproj, '--host', '127.0.0.1', '--port', $Port, '-c', $Contexte, '-ctk', 'q8_0', '-ctv', 'q8_0', '-fa', 'auto', '--temp', '0', '--seed', '42', '--image-max-tokens', $JetonsImage, '--parallel', '1', '--no-webui')
switch ($Config) {
  'gpu-max'         { $extra = @('-ngl', 'auto') }
  'hybride'         { $extra = @('-ngl', $Couches) }
  'cpu'             { $extra = @('-ngl', '0', '--no-mmproj-offload') }
  'moe-experts-ram' { $extra = @('-ngl', '99', '--cpu-moe') }
}
# Écoute sur 127.0.0.1 uniquement : rien n'est accessible depuis le réseau ni Internet.
Write-Output ("Commande : " + $Serveur + ' ' + (($commun + $extra) -join ' '))
& $Serveur @commun @extra
