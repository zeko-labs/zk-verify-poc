# TASKLIST

Last updated: 2026-02-19
Status legend: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`

## Usage Contract (Mandatory)
1. Move the target task to `IN_PROGRESS` before editing implementation files.
2. RED first: add or adjust tests and capture failing evidence.
3. GREEN second: implement the minimal fix and capture passing evidence.
4. REFACTOR third: optional cleanup without behavior changes.
5. Update this file immediately after each RED/GREEN step with command evidence.

## Active Pointer
- `NEXT_TASK_ID`: `NONE`
- Current owner status: `DONE`
- Resume location: `Queue complete; monitor for new tasks`.

## Verified Baseline (Already Green)
- [x] `DONE` `T-001` Fresh repo initialized and core structure created.
- [x] `DONE` `T-002` Toolchain bootstrapped with latest `node` and `pnpm` via `proto`.
- [x] `DONE` `T-003` `moon` orchestration configured (`moon.yml` tasks wired).
- [x] `DONE` `T-004` TLSNotary added as git submodule at `vendor/tlsn`.
- [x] `DONE` `T-005` Repo-local skills installed under `.agents/skills` (`proto`, `moon`).
- [x] `DONE` `T-006` Core handoff docs added (`README.md`, `AGENTS.md`, `TASKLIST.md`).
- [x] `DONE` `T-007` TypeScript quality gate passing.
  Evidence: `moon run poc:validate-ts` and `moon run workspace:validate` (re-verified 2026-02-19)
- [x] `DONE` `T-008` Unit tests passing.
  Evidence: `moon run poc:test`, `moon run mock-server:test`, and `moon run workspace:test` (re-verified 2026-02-19)
- [x] `DONE` `T-009` Rust tests passing.
  Evidence: `moon run tlsnotary:test` (re-verified 2026-02-19)
- [x] `DONE` `T-010` Local cryptographic path executed through proof verification.
  Evidence: mock server -> notary/prover -> extract -> prove -> verify.
- [x] `DONE` `T-011` Repo reorganized for cold-start handoff.
  Evidence: updated `README.md`, `AGENTS.md`, `TASKLIST.md`, `.agents/README.md`.
- [x] `DONE` `T-012` Moon projects normalized by component with project-local tests.
  Evidence: added `poc/moon.yml`, `mock-server/moon.yml`, moved tests into `poc/tests` and `mock-server/tests`.
- [x] `DONE` `T-013` Removed `HANDOFF.md`; continuation source consolidated to `README.md`, `PRD.md`, and `TASKLIST.md`.
  Evidence: deleted `.agents/HANDOFF.md`, updated references in `AGENTS.md`, `README.md`, `.agents/README.md`, and `TASKLIST.md`.
- [x] `DONE` `T-014` Refactored Node codebase into pnpm workspace package `poc` and removed orphan root `contracts/`.
  Evidence: moved `scripts/` -> `poc/`, moved `circuits/` and `contracts/` into `poc/`, added `pnpm-workspace.yaml` and `poc/package.json`.
- [x] `DONE` `T-015` Simplified moon commands and removed explicit install task.
  Evidence: removed `workspace:install` task, added `.moon/toolchains.yml`, enabled `pipeline.installDependencies`, switched project tasks to direct `pnpm exec` commands with workspace-root execution.

## Open Work Queue (Ordered)

### `T-201` Backfill RED coverage for already-green modules
Status: `DONE`
Goal: enforce strict Red/Green history where implementation exists but failure-first evidence is missing.

RED checklist:
- [x] Add failing test for missing `TLSNOTARY_SIGNING_KEY_HEX`.
- [x] Add failing test for invalid mock-server cert/key path handling.
- [x] Add failing tamper test for ECDSA signature mismatch during proving.
- [x] Add failing tamper test for eligibility rule violations (salary/tenure/status).

GREEN checklist:
- [x] Implement minimum code changes to satisfy each RED case.
- [x] Re-run full suite and keep baseline green.

Evidence log:
- RED: `moon run tlsnotary:test` failed in `Given_missing_TLSNOTARY_SIGNING_KEY_HEX_When_loading_required_env_Then_error_uses_fail_fast_contract` (expected `missing required env var: ...`, got `missing required environment variable: ...`).
- RED: `moon run mock-server:test` failed in new TLS path tests because `createTlsServerOptions` was not exported and diagnostics contract was missing.
- RED: `moon run poc:test` failed in `poc/tests/prove-input.spec.ts` because `../lib/prove-input.js` did not exist for ECDSA tamper preflight coverage.
- RED: `moon run poc:test` failed in new salary/tenure/status policy tests because `assertEligibilityPolicy` was not implemented.
- GREEN: `moon run tlsnotary:test` passed after updating `required_env` fail-fast diagnostic format.
- GREEN: `moon run mock-server:test` passed after exporting `createTlsServerOptions` and adding fail-fast cert/key file diagnostics.
- GREEN: `moon run poc:test` passed after adding `poc/lib/prove-input.ts` integrity validation and wiring it into `poc/prove.ts` for ECDSA tamper fail-fast behavior.
- GREEN: `moon run poc:test` passed after implementing `assertEligibilityPolicy` preflight checks for salary/tenure/status diagnostics.
- GREEN: `moon run workspace:validate` initially failed only on `poc:format` (format issues in `mock-server/server.ts` and `poc/lib/prove-input.ts`), then proceeded to formatting fix + revalidation.
- GREEN: `moon run poc:format-write` and subsequent `moon run workspace:validate` passed; baseline restored green.

### `T-202` Deploy + settle runtime validation on funded account
Status: `DONE`
Blocker: cleared (GraphQL account lookup returned funded balance for `FEE_PAYER_PUBLIC_KEY`).

Unblock condition:
- [x] Faucet funding completed by operator.

Execution:
- [x] Run `moon run poc:deploy`.
- [x] Run `moon run poc:settle`.
- [x] Capture tx hash + explorer URL in `.agents/findings/TEMPLATE.md`.

Evidence log:
- Attempt 1: `moon run poc:deploy` submitted tx `5JuwtV5ihXuAqgEKZxWCcPGbKZr2gd7aGxcUPp3Vv4fW5DRKuMx9` but failed on `pendingTx.wait()` with GraphQL error `Field 'bestChain' is not defined on type 'query'`.
- Attempt 2: `moon run poc:deploy` failed with `Account_nonce_precondition_unsatisfied`, traced to already-existing `ZKAPP_PUBLIC_KEY` account after prior submit.
- GREEN: patched `poc/deploy.ts` to support idempotent existing-account handling and nonce polling; `moon run poc:deploy` then passed and wrote `output/deployed-address.json`.
- GREEN: patched `poc/settle.ts` to compile contract before proving and use nonce polling; `moon run poc:settle` passed with tx `5JvAqXUdeYupezQBAJmeZPKm5YEZsMcnzbviu3QvhYjxp3vvkUa6` and nonce advance `1 -> 2`.

### `T-203` End-to-end runner hardening
Status: `DONE`
Goal: make `run-poc.sh` reliable for repeated local runs.

RED checklist:
- [x] Add smoke test for process startup ordering and cleanup.
- [x] Add smoke test for failure-path cleanup.

GREEN checklist:
- [x] Patch script logging and trap/cleanup behavior.

Evidence log:
- RED: `moon run poc:test` failed in `poc/tests/run-poc.spec.ts` because `run-poc.sh` did not emit `[run-poc] cleanup complete` on success path.
- RED: `moon run poc:test` failed in `poc/tests/run-poc.spec.ts` because `run-poc.sh` did not emit `[run-poc] failed at step: poc:settle` on failure path.
- GREEN: `moon run poc:test` passed after patching `run-poc.sh` with step-scoped failure diagnostics and robust cleanup logging.
- GREEN: `/usr/bin/time -p moon run workspace:run` passed end-to-end in `real 74.63s` with settlement tx `5Jv8ZTJ359Rgbk8hisSvfTtQJHrxANFndsZFECRyKdigaNTbSJpu`.

### `T-204` Findings completion and go/no-go output
Status: `DONE`
Goal: complete PRD evidence pack.

Checklist:
- [x] Fill `.agents/findings/TEMPLATE.md` with measured timings and logs.
- [x] Resolve all PRD Section 8 known-unknown answers with concrete evidence.
- [x] Record recommended version pins for MVP handoff.

Evidence log:
- GREEN: updated `.agents/findings/TEMPLATE.md` with environment snapshot, successful runtime timings, and pass/fail criterion results.
- GREEN: resolved PRD Section 8 known unknowns with concrete run/code evidence and session-header serialization details.
- GREEN: recorded version pins (`o1js 2.13.0`, `vendor/tlsn` commit `c55853b3`, `node 25.6.1`, `pnpm 10.30.0`) and added Go/No-Go assessment.
- GREEN: `moon run workspace:validate` re-passed after final lint/format cleanup (`poc/tests/run-poc.spec.ts`, `poc/deploy.ts`, `poc/settle.ts`).

### `T-205` GraphQL source-of-truth deployment verification
Status: `DONE`
Goal: verify deployed zkApp/account existence and settlement evidence directly from node GraphQL instead of explorer.

RED checklist:
- [x] Add failing unit tests for GraphQL response validation and deployment checks.
- [x] Add failing CLI-level test for a GraphQL verification command.

GREEN checklist:
- [x] Implement GraphQL verification module + CLI script.
- [x] Wire moon task and optional end-to-end runner callout.
- [x] Re-run validation/tests and keep baseline green.

Evidence log:
- RED: `moon run poc:test` failed in `poc/tests/chain-verification.spec.ts` because `poc/lib/chain-verification.ts` did not exist.
- RED: `moon run poc:test` failed in `poc/tests/run-poc.spec.ts` because success-path order did not include `poc:verify-chain`.
- GREEN: implemented `poc/lib/chain-verification.ts` and `poc/verify-chain.ts` with strict GraphQL account/event checks.
- GREEN: wired `poc:verify-chain` in `poc/moon.yml`, added to `run-poc.sh` stage flow, and documented command in `README.md`.
- GREEN: `moon run poc:test` passed with new `poc/tests/chain-verification.spec.ts` and updated `poc/tests/run-poc.spec.ts`.
- GREEN: `moon run poc:verify-chain` passed against node GraphQL and returned matching on-chain zkApp state/event evidence.
- GREEN: `moon run workspace:validate` re-passed after format/type cleanup for new verification tests.
- GREEN: `moon run workspace:run --updateCache` passed with new `[7/7]` GraphQL verification stage and settlement tx `5JuNZHJ3GLGVAHySnPYRs5dhJkKyG8NEKzEMBUTm9RccnGijo899`.

### `T-206` Deployment instructions clarity for fresh-start users
Status: `DONE`
Goal: document where the zkApp/circuit is deployed and provide from-scratch deployment steps with node-source verification.

RED checklist:
- [x] Add failing docs check for missing deployment-location guidance.
- [x] Add failing docs check for missing from-scratch deployment walkthrough.

GREEN checklist:
- [x] Update `README.md` with explicit deployment target details and clean-room workflow.
- [x] Re-run docs checks and keep workspace validation green.

Evidence log:
- RED: `rg -n "Where The zkApp Is Deployed|From Scratch Deployment Workflow" README.md` failed (sections absent).
- RED: `rg -n "moon run poc:deploy.*moon run poc:settle.*moon run poc:verify-chain" README.md` failed (no explicit from-scratch ordered deploy block).
- GREEN: updated `README.md` with `Where The zkApp Is Deployed` and `From Scratch Deployment Workflow` sections.
- GREEN: `rg -n "Where The zkApp Is Deployed|From Scratch Deployment Workflow" README.md` passed.
- GREEN: `rg -n "moon run poc:deploy|moon run workspace:run|moon run poc:verify-chain" README.md` passed.
- GREEN: `moon run workspace:validate` passed after docs update; baseline remained green.
