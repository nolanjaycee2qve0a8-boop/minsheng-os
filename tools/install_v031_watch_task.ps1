param([switch]$ConfirmInstall,[switch]$WhatIf=$true)
$Project=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$Python='python'; $TaskName='MinshengOS-v031-OfficialReleaseWatch'; $Command="`"$Python`" `"$Project\tools\run_v031_watch.py`" --watch --due-only --execute --run-id scheduler_watch"
$Audit=[ordered]@{taskName=$TaskName;workingDirectory=$Project;command=$Command;frequency='Daily 09:30 Asia/Shanghai; watcher retains per-provider interval';requiresAdmin=$false;defaultMode='WhatIf';schedulerStatus='SCHEDULER_PACKAGE_READY / SCHEDULER_NOT_INSTALLED'}
$Audit|ConvertTo-Json -Depth 4
if(-not $ConfirmInstall){Write-Output 'Not installed: pass -ConfirmInstall to create the task.';exit 0}
if($WhatIf){Write-Output 'WhatIf: task creation preview only.';exit 0}
$Action=New-ScheduledTaskAction -Execute $Python -Argument "`"$Project\tools\run_v031_watch.py`" --watch --due-only --execute --run-id scheduler_watch" -WorkingDirectory $Project
$Trigger=New-ScheduledTaskTrigger -Daily -At 9:30AM
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Description 'Minsheng OS v0.31 official release watch; no REAL submission.' -Force | Out-Null
Write-Output 'SCHEDULER_INSTALLED'
