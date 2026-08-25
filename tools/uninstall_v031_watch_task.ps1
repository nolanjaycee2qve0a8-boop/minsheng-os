param([switch]$ConfirmUninstall,[switch]$WhatIf=$true)
$TaskName='MinshengOS-v031-OfficialReleaseWatch'; [ordered]@{taskName=$TaskName;defaultMode='WhatIf';preserves='runs, manifests, raw artifacts'}|ConvertTo-Json
if(-not $ConfirmUninstall){Write-Output 'Not uninstalled: pass -ConfirmUninstall to remove the scheduler task only.';exit 0}
if($WhatIf){Write-Output 'WhatIf: task removal preview only.';exit 0}
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Output 'SCHEDULER_NOT_INSTALLED'
