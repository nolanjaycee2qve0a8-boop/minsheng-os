# v0.31 — Official Release Calendar and Watch

## Safety boundary

The watch performs only `DISCOVERY → ACQUISITION → VALIDATION → STAGING/PREVIEW → REVIEW QUEUE`. `APPROVED_SUBMISSION` is absent from every watch job. It cannot create approval records, REAL observations, Git commits, external messages, scenario runs or causal changes.

## Calendar qualification

All 17 v0.30 release families have a versioned calendar entry. No unsupported publication date was invented: calendar entries use `HISTORICAL_CADENCE_ONLY` or `CALENDAR_UNKNOWN`, retain `expectedPublicationDate=UNKNOWN`, and enforce a 720-hour minimum check interval. Unknown calendars become low-frequency `CALENDAR_UNKNOWN_MANUAL_WATCH`, not a daily crawl.

## Scheduler package

`tools/install_v031_watch_task.ps1` and `tools/uninstall_v031_watch_task.ps1` default to preview. They require `-ConfirmInstall`/`-ConfirmUninstall`, preserve all manifests and raw artifacts, require no credential, and were not installed. Status: `SCHEDULER_PACKAGE_READY / SCHEDULER_NOT_INSTALLED`.

## LIVE due-only run

`v031_live_due_only_20260822` assessed all 17 families at fixed `2026-08-22T00:00:00Z`, found 17 low-frequency eligible manual-watch jobs and made 17 auditable requests. Ten passed content validation and SHA audit; failures are retained in the same manifest. The run produced a review entry for every attempted job, with `fixtureCounted=0`, `submittedReal=0`, `approvalRecordsCreated=0`, and `gitCommitsCreatedByWatcher=0`.
