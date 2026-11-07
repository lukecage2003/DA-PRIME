# Test de fumée : le modèle voit-il vraiment l'image ? (à lancer après lancer-serveur.ps1 ; aucune donnée externe)
# Envoie une image de contrôle (un carré rouge sur fond blanc, générée localement) et vérifie que la réponse le mentionne.
param([int] $Port = 8090)
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 256, 256; $g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::White); $g.FillRectangle([System.Drawing.Brushes]::Red, 64, 64, 128, 128)
$ms = New-Object System.IO.MemoryStream; $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); $b64 = [Convert]::ToBase64String($ms.ToArray())
$corps = @{ messages = @(@{ role = 'user'; content = @(@{ type = 'image_url'; image_url = @{ url = "data:image/png;base64,$b64" } }, @{ type = 'text'; text = 'What shape and colour do you see? Answer in five words.' }) }); temperature = 0; max_tokens = 20 } | ConvertTo-Json -Depth 8
$r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/chat/completions" -Method Post -ContentType 'application/json' -Body $corps -TimeoutSec 600
$texte = $r.choices[0].message.content
Write-Output "Réponse : $texte"
if ($texte -match 'red' -and $texte -match 'square') { Write-Output 'VISION OPÉRATIONNELLE' } else { Write-Output 'ÉCHEC : la vision ne semble pas fonctionner avec ce modèle et ce runtime' }
