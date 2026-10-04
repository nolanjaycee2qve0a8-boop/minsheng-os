# v0.39 first pilot: transport ready, actual launch held

Baseline `4aa717dadfe32ee7d4d27f473584a42611e9488c`; branch `codex/generation-live-preparation-20261004`. Local implementation only. No push/PR/merge/deploy, real HTTP, credentials, paid attempts or real ledger created during preparation.

The user approved their own DeepSeek account, at most20 requests, an application first-pilot budget ofUSD1, no automatic continuation, registered public evidence plus normalized topic/metric/time/geography, no chat/history/private/raw material, and only api.deepseek.com as the additional domain. This grants neither monthly spending nor credential/network readiness. The prior OFFLINE proposal policy remains for its tests; LIVE uses a separate immutable lifetime policy with no monthly allowance/reset/renewal.

## Current official bounds

On2026-10-04, [official pricing](https://api-docs.deepseek.com/quick_start/pricing/) still lists `deepseek-flash`, DeepSeek-V4.1-Flash,1M context, and peak USD/million token rates: cache hit0.006, miss0.30, output1.20. Non-thinking, non-streaming, max_tokens1600, JSON-only two-message input remain pinned. Reverify the same official page immediately before an actual start. The receipt requires today's date to equal the reviewed snapshot date and exact price version; a different date/model/rate needs review and an explicit ledger migration that preserves attempts, held and settled costs. No automatic repricing or fresh-ledger reset.

All20 approved inputs passed offline preparation. Complete serialized request UTF8 bytes plus1024 framing allowance range2370–5833 (q20 maximum), under the6000 preflight envelope. This is not an official tokenizer upper-bound proof. LIVE therefore reserves the full documented1M context conservatively interpreted as1,048,576 input tokens at cache-miss peak, plus1600 output: ceil(1,048,576×0.30+1600×1.20)=316,493 micro-USD/request. This is intentionally larger than the prior6000-token estimate of3720 micro-USD. Known valid usage releases the difference; the mock500-input/200-output example accounts361 micro-USD. Usage above the intended6000/1600 envelope freezes the pilot even if below the conservative reservation. The reservation assumes the documented model context/output cap and peak prices are honored; it cannot control another application's or the account's invoice.

LIVE records max20 cumulative attempts and max1,000,000 held/settled micro-USD across this single pilot, including failures; no reset across processes/months. Unknown or still-reserved billing blocks all NEW LIVE IDs until trusted manual reconciliation. SameID is never resent after unknown failure/restart. Fixed topic request IDs prevent a repeated launcher command creating another attempt. No loop, scheduler, connectivity probe or automatic retry. LIVE user JSON contains only contractVersion, approvedEvidence, and questionSummary with topic (registered q01–q20 ID), metricIds, period, geography. Internal intent/scenario fields remain local; approved evidence classifications retain their explicit REAL/DERIVED/GAP/UNKNOWN/BLOCKED/SCENARIO boundaries.

## Network secret contract — no plaintext env fallback

The preparation handoff reports an official Network secret facility that substitutes a non-secret placeholder only for the configured HTTPS domain; original secrets stay outside local processes/files. This code takes ONLY confirmed non-secret metadata. It never reads process.env.DEEPSEEK_API_KEY, secret values or credential files, and has no ordinary-env-key fallback. Needed UI request:

- Key: `DEEPSEEK_API_KEY`, requested for the selected minsheng cloud environment only.
- Type: Network secret, exact target domain `api.deepseek.com`.
- Header: `Authorization`, built as `Bearer ` followed by the exact official non-secret placeholder.
- User enters only the actual DeepSeek key in the secure UI; no chat/shell/repository/ledger/log copy. The UI value is the key, not an invented sentinel or guessed JSON.

The placeholder syntax and platform interception compatibility with Node HTTPS are STILL UNCONFIRMED in this task. Do not guess `${...}`, secret URIs, sentinel encodings, proxy settings or fill a real key into the command. The launcher accepts a non-secret placeholder only after the main/browser task supplies authoritative syntax/metadata and confirms the secure handoff. The injectable metadata contract records key/domain/source/placeholder; its source label is a trusted-operator assertion, not an independently verifiable platform credential attestation. `--check` says placeholderSyntaxConfirmed:false until that external handoff. No secret UI is configured here.

Transport fixes HTTPS443, hostname/servername api.deepseek.com, `/chat/completions`, TLS verification/minimumTLS1.2, POST, private Authorization header, identity encoding, no caller headers/host/path/query/proxy/agent, no redirects or retry. The default is Node HTTPS, not fetch or a configurable endpoint. Stream limit64KiB is enforced while reading, plus timeout/AbortSignal, premature close and declared-length checks. TLS/proxy interception must be compatible with the supported environment mechanism; do not disable certificate validation, read a real env key, add proxy hosts or swap executors to bypass a failure. Unknown failures hold cost and stop new requests. LIVE transports are factory-branded and frozen; adapter LIVE also requires the approved pilot ledger. Claims retain the v037 guard and HUMAN_REVIEW_REQUIRED boundary. LIVE actualCost is null (unknown invoice), never fake zero; applicationAccountedMicroUsd is usage×pinned rates.

## Persistent ledger and single-topic commands

One fixed non-repository path: `/workspace/.minsheng-runtime/deepseek-first-pilot/budget.json`, private directory0700, ledger/temp/locks0600. Ledger transaction uses lock/fsync/atomic rename/directory fsync; launcher also holds an exclusive pilot-run.lock across the single request. Orphan locks require stopping all processes and preserving/inspecting all held records before manual removal. No automatic lock stealing, deletion/refund, alternate ledger CLI option or monthly reset. The environment operator must confirm this path is genuinely durable across future tasks/restarts. A task-local `/workspace` does not prove shared/persistent volume durability. Actual ledger is not yet created, so no paid state currently needs transfer.

Offline, no network or secrets:

```sh
node tools/run_generation_pilot.js --check
```

After a NEW task has the published network configuration, authoritative non-secret placeholder metadata, secure UI key and durable volume confirmed, run exactly one topic. The following template is NOT a current executable authorization to launch; replace only the non-secret placeholder token with its officially confirmed literal, never a key. If the day has changed, first update/review price snapshot and retain any ledger state.

```sh
install -d -m 700 /workspace/.minsheng-runtime/deepseek-first-pilot
node tools/run_generation_pilot.js --live --handoff-ready --topic q01 --price-version deepseek-flash-peak-20261004 --price-checked 2026-10-04 --network-secret-placeholder 'OFFICIAL_NON_SECRET_PLACEHOLDER_PENDING_CONFIRMATION'
```

The flags attest completion of the main-thread handoff, not network diagnostics or secret validity. One command performs at most one attempt; rerunning q01 returns the persisted result or held status. Inspect each result before manually selecting the next approved topic. Invalid output still consumes one attempt and known/possibly incurred cost. Results are guarded analysis, never a new REAL record.

## New-task code handoff and remaining blockers

The browser task says network publication applies to new tasks; this existing task cannot assume it changed. An unpublished local branch is also not guaranteed in a fresh environment clone. Minimal normal path: separately authorize push of ONLY the final reviewed `codex/generation-live-preparation-20261004` commit to the existing repository; no merge/main change needed; start a new task with the published selected environment and check out that exact branch/SHA. This task does not push, change environments or substitute Library/bundles/chat-file transfer. If runtime persistence is not shared across tasks, provision/confirm an approved persistent mount before the FIRST paid call; after costs exist, never start another empty ledger elsewhere.

Blocking actual launch: official non-secret placeholder syntax and HTTPS interception compatibility; secure UI/network publication confirmed in the new task; candidate code available through separately authorized normal Git handoff; durable ledger storage confirmed; same-day price/model check. No uncredentialed/billable connectivity probes were run. No monthly authorization exists. No real API/LIVE/paid/key/local-original/browser validation occurred in this phase; all transport tests use synthetic injected HTTP with real network/secret reads forbidden.
