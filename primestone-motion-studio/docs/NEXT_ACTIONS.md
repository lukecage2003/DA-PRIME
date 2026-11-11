# Prochaines actions

Rien de ce qui suit n'est engagé. La phase 2 ne démarre pas sans accord.

## De votre côté

1. **Fournir le dossier maître de reprise** (D-003). Sans lui, exigences et A1–A15 restent inconnus.
2. **Indiquer comment accéder au poste Windows** (D-002) : session Claude Code lancée sur ce poste, ou dossier du
   poste partagé avec une session cloud. À défaut, exécuter l'inventaire ci-dessous et transmettre la sortie.
3. **Trancher D-001** (dépôt dédié ou sous-dossier) et **D-004** (licence et distribution).
4. **Répondre à D-005 et D-006** (Windows et machine de référence ; formats garantis).
5. **Approuver ou corriger** la roadmap, l'architecture et le plan de prototypes (D-010, D-011).

Inventaire Windows, en lecture seule (PowerShell) :

```powershell
Get-ComputerInfo | Select-Object OsName, OsVersion, OsBuildNumber, CsProcessors, CsTotalPhysicalMemory
Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM
Get-PSDrive -PSProvider FileSystem | Select-Object Name, Used, Free
node -v; npm -v; rustc -V; cargo -V; rustup show; git --version; ffmpeg -version
& "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe" -all -products * -format json
Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}' | Select-Object pv
dxdiag /t "$env:TEMP\dxdiag.txt"
```

`AdapterRAM` est plafonné à 4 Go par Windows : la VRAM réelle se lit dans `dxdiag.txt`.

## Ensuite, après accord

6. Rapprocher le dossier maître de ces documents : exigences dans `REQUIREMENTS_TRACEABILITY.md`, correspondance
   A1–A15 ↔ P0–P5, contradictions signalées.
7. Compléter l'inspection Windows et mettre à jour `CURRENT_STATE.md`.
8. Soumettre la liste exacte des installations nécessaires à P0 (D-007), puis lancer P0, P1 et P2 dans cet ordre.
