# Étape 0 — Mesurer la machine RÉELLE (aucune donnée envoyée). Usage : .\etat-machine.ps1 > machine.txt
$os = Get-CimInstance Win32_OperatingSystem
$cpu = Get-CimInstance Win32_Processor
$mem = Get-CimInstance Win32_PhysicalMemory
Write-Output ("Système : {0} {1}" -f $os.Caption, $os.Version)
Write-Output ("Processeur : {0} · {1} cœurs / {2} fils" -f $cpu.Name, $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors)
Write-Output ("RAM totale : {0:N1} Go · libre maintenant : {1:N1} Go" -f ($os.TotalVisibleMemorySize/1MB), ($os.FreePhysicalMemory/1MB))
Write-Output ("Barrettes : {0} (double canal si 2 barrettes identiques)" -f $mem.Count)
$mem | ForEach-Object { Write-Output ("  {0} · {1:N0} Go · {2} MT/s" -f $_.DeviceLocator, ($_.Capacity/1GB), $_.Speed) }
Write-Output ("Fichier d'échange : {0:N1} Go" -f ((Get-CimInstance Win32_PageFileUsage | Measure-Object AllocatedBaseSize -Sum).Sum/1024))
Get-PSDrive -PSProvider FileSystem | ForEach-Object { if ($_.Free) { Write-Output ("Disque {0}: {1:N0} Go libres" -f $_.Name, ($_.Free/1GB)) } }
try { & nvidia-smi --query-gpu=name,memory.total,memory.used,driver_version --format=csv } catch { Write-Output "nvidia-smi introuvable (pilote NVIDIA ?)" }
