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
- `NEXT_TASK_ID`: `T-201`
- Current owner status: `IN_PROGRESS`
- Resume location: `T-201` in this file.

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
Status: `IN_PROGRESS`
Goal: enforce strict Red/Green history where implementation exists but failure-first evidence is missing.

RED checklist:
- [ ] Add failing test for missing `TLSNOTARY_SIGNING_KEY_HEX`.
- [ ] Add failing test for invalid mock-server cert/key path handling.
- [ ] Add failing tamper test for ECDSA signature mismatch during proving.
- [ ] Add failing tamper test for eligibility rule violations (salary/tenure/status).

GREEN checklist:
- [ ] Implement minimum code changes to satisfy each RED case.
- [ ] Re-run full suite and keep baseline green.

Evidence log:
- RED: pending
- GREEN: pending

### `T-202` Deploy + settle runtime validation on funded account
Status: `BLOCKED`
Blocker: requires funded `FEE_PAYER_PUBLIC_KEY`.

Unblock condition:
- [ ] Faucet funding completed by operator.

Execution:
- [ ] Run `moon run poc:deploy`.
- [ ] Run `moon run poc:settle`.
- [ ] Capture tx hash + explorer URL in `.agents/findings/TEMPLATE.md`.

### `T-203` End-to-end runner hardening
Status: `TODO`
Goal: make `run-poc.sh` reliable for repeated local runs.

RED checklist:
- [ ] Add smoke test for process startup ordering and cleanup.
- [ ] Add smoke test for failure-path cleanup.

GREEN checklist:
- [ ] Patch script logging and trap/cleanup behavior.

### `T-204` Findings completion and go/no-go output
Status: `TODO`
Goal: complete PRD evidence pack.

Checklist:
- [ ] Fill `.agents/findings/TEMPLATE.md` with measured timings and logs.
- [ ] Resolve all PRD Section 8 known-unknown answers with concrete evidence.
- [ ] Record recommended version pins for MVP handoff.
