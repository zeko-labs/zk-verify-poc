# TASKLIST

Last updated: 2026-02-21
Status legend: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`

## Usage Contract (Mandatory)
1. Move the target task to `IN_PROGRESS` before editing implementation files.
2. RED first: add or adjust tests and capture failing evidence.
3. GREEN second: implement the minimal fix and capture passing evidence.
4. REFACTOR third: optional cleanup without behavior changes.
5. Update this file immediately after each RED/GREEN step with command evidence.

## Active Pointer
- `NEXT_TASK_ID`: `T-224`
- Current owner status: `DONE`
- Resume location: `T-224` reviewer fixes completed; await next task selection.

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

### `T-207` Scoped security/remediation pass (excluding PRD-listed PoC limitations)
Status: `DONE`
Goal: fix all validated issues that are not listed as PoC limitations in `PRD.md`, while preserving the declared limitation that transcript-level selective disclosure binding is out-of-scope for this PoC cycle.

Out-of-scope by PRD limitation:
- [x] Do not implement full transcript byte-range binding / presentation-merkle integration in this task.

RED checklist:
- [x] Add failing tests for contract proof-input enforcement (`recordVerification` must verify typed proof).
- [x] Add failing tests for trusted notary key enforcement and verifier-visible policy parameters.
- [x] Add failing tests for prover CRLF sanitization.
- [x] Add failing tests for `run-poc.sh` readiness polling (replace fixed sleeps).
- [x] Add failing docs check for hardcoded absolute install/refresh paths in `.agents/skills/README.md`.

GREEN checklist:
- [x] Implement contract method proof verification and update settle flow.
- [x] Implement circuit/prover constraints for trusted key + non-private policy assumptions and remove `any` circuit argument types.
- [x] Implement CRLF sanitization in TLSNotary prover env handling.
- [x] Implement service readiness polling in `run-poc.sh`.
- [x] Replace hardcoded absolute install/refresh paths with portable variables.
- [x] Update `README.md` and `PRD.md` clarifying implemented fixes vs PoC limitations.
- [x] Run full validation and runtime pipeline gates.

Evidence log:
- RED: `moon run poc:test` failed in new `poc/tests/security-contract.spec.ts` because `VerificationRegistry.recordVerification` still accepts `[Field, Field]` and the eligibility circuit still exposes notary key/policy as prover-controlled private inputs.
- RED: `moon run poc:test` failed in new `poc/tests/prove-input.spec.ts` because `validateProofInputIntegrity` accepted a valid signature under an untrusted notary key.
- RED: `moon run poc:test` failed in new `poc/tests/run-poc.spec.ts` because `run-poc.sh` still uses fixed sleeps and does not define readiness polling helper `wait_for_tcp`.
- RED: `moon run poc:test` failed in new `poc/tests/skills-readme.spec.ts` because `.agents/skills/README.md` still documents hardcoded `/Users/hebilicious/...` absolute paths.
- RED: `moon run tlsnotary:test` failed because `sanitize_http_path` / `sanitize_http_host_header_value` do not exist yet for CRLF-safe request input handling.
- GREEN: updated `poc/contracts/VerificationRegistry.ts` to accept `EligibilityProof`, call `proof.verify()`, and derive `result` from `proof.publicOutput`; updated `poc/settle.ts` and `poc/deploy.ts` to compile the eligibility program and use typed proof submission.
- GREEN: refactored `poc/circuits/eligibility.ts` to remove prover-controlled key/policy private inputs, pin trusted notary public key constants, and replace `any` method args with concrete `EcdsaSignature` / `SessionHeaderBytes` types.
- GREEN: added fixed security configuration in `poc/lib/poc-security-config.ts` and enforced trusted key/session-header checks in `poc/lib/prove-input.ts`; `moon run poc:test` now passes with new security and portability tests.
- GREEN: implemented CRLF sanitizers in `tlsnotary/src/lib.rs` and wired them into `tlsnotary/src/bin/prover.rs`; `moon run tlsnotary:test` now passes.
- GREEN: patched `run-poc.sh` to replace fixed startup sleeps with active readiness checks (TCP polling for mock server + LISTEN-port polling for one-shot notary), added explicit skip hook for smoke tests, and updated `.agents/skills/README.md` to portable `$HOME`/`$(pwd)` paths.
- GREEN: updated `README.md` and `PRD.md` to clarify implemented hardening guarantees and explicitly preserve transcript byte-range binding as a declared PoC limitation.
- GREEN: updated `poc/deploy.ts` to handle existing zkApp verification-key upgrades in-place when contract verification key hash changes.
- GREEN: `moon run mock-server:test`, `moon run poc:test`, `moon run tlsnotary:test`, and `moon run workspace:test` passed.
- GREEN: `moon run workspace:validate` initially failed on `poc:format` for updated files, then passed after `moon run poc:format-write`.
- GREEN: `moon run poc:deploy` passed and updated on-chain verification key hash to match current contract build.
- GREEN: `moon run workspace:run` initially failed due notary readiness probe consuming the single accepted connection (fixed by LISTEN-port readiness strategy), then passed end-to-end with settlement tx `5JtgdDrRx2HWDTmnvC4N7JX8bTsSRFKAtSzXqtuHn7MHBj3BTUNU`.

### `T-208` Output directory consistency
Status: `DONE`
Goal: ensure artifacts are written to a consistent output location contract across standalone stages and workspace runner flows.

RED checklist:
- [x] Add failing test for default output path contract (`output/latest` when `OUTPUT_DIR` is unset).
- [x] Add failing docs check that README explicitly documents output path behavior.

GREEN checklist:
- [x] Implement output path default consistency in shared path utility.
- [x] Update script logging to print concrete artifact paths from runtime constants.
- [x] Update `README.md` to document timestamped run output and standalone default output behavior.
- [x] Re-run required tests/validation.

Evidence log:
- RED: `moon run poc:test` failed in new `poc/tests/paths.spec.ts` because `outputDir()` currently defaults to `output` instead of `output/latest` when `OUTPUT_DIR` is unset.
- RED: `moon run poc:test` failed in new `poc/tests/readme-output.spec.ts` because `README.md` does not yet document `output/latest` default behavior for standalone stage commands.
- GREEN: updated `poc/lib/paths.ts` so `outputDir()` now defaults to `output/latest`; `moon run poc:test` passes with `poc/tests/paths.spec.ts`.
- GREEN: updated `poc/extract-fields.ts` and `poc/prove.ts` logs to print resolved artifact paths from runtime constants.
- GREEN: updated `tlsnotary/src/bin/prover.rs` default standalone output base from `../output` to `../output/latest` for consistency with TS stage defaults.
- GREEN: updated `README.md` output section to explicitly cover both `output/<timestamp>/` (runner) and `output/latest/` (standalone stages).
- GREEN: `moon run workspace:validate` passed after formatting fix (`moon run poc:format-write`) with `poc:test` at 29/29 passing tests.
- GREEN: `moon run workspace:run` passed end-to-end with settlement tx `5JvCAbtHQtqiRARQzzDpvKaUPv3GUD8Jcn2tsUiUyDb62MYJtLhM`.

### `T-209` Revert empty-dir automation and adopt moon server presets
Status: `DONE`
Goal: remove automated empty timestamp directory pruning/test coverage and switch server tasks to moon `preset: server`.

RED checklist:
- [x] Add/adjust tests to capture desired simplified behavior after removing empty-dir automation coverage.

GREEN checklist:
- [x] Remove empty-dir pruning logic and empty-dir smoke tests/docs/tasklist references.
- [x] Configure all server tasks to use moon `preset: server`.
- [x] Re-run relevant validation/tests and runtime orchestration command(s).

Evidence log:
- RED: adjusted `poc/tests/run-poc.spec.ts` to remove empty-dir lifecycle assertions and keep orchestration/diagnostics coverage only.
- GREEN: removed empty-dir automation from `run-poc.sh` (no auto-prune/auto-delete behavior), and removed empty-dir behavior references from `README.md` and `TASKLIST.md` `T-208`.
- GREEN: updated server tasks to moon `preset: server` in `mock-server/moon.yml` (`serve`) and `tlsnotary/moon.yml` (`notary`).
- GREEN: manually cleared current empty timestamp output directories via `find output -mindepth 1 -maxdepth 1 -type d -empty -exec rmdir {} +`.
- GREEN: `moon run poc:test` passed (27/27 tests).
- GREEN: `moon run workspace:validate` passed.
- GREEN: `moon run workspace:run` passed end-to-end with settlement tx `5Ju2eVFRVkru9mXB8caB1Vq4o75vqAY9cs1q8EjQnKXxUfzq1BRV`.

### `T-210` Nuxt SPA UI MVP + Cloudflare worker deployment
Status: `DONE`
Goal: implement a strict SPA Nuxt UI that visualizes timestamped PoC runs, with filesystem output sync into public assets and Cloudflare Worker static deployment config.

RED checklist:
- [x] Add failing tests for SPA config contract (`ssr: false`) and wrangler static SPA fallback.
- [x] Add failing tests for output sync selection contract (timestamp runs only + optional `deployed-address.json`).
- [x] Add failing tests for proof status derivation and graceful empty-state behavior.

GREEN checklist:
- [x] Bootstrap `ui/` with latest Nuxt using `nuxi`.
- [x] Implement custom Nuxt module to copy `output/<timestamp>/` and `output/deployed-address.json` into `ui/public/proof-data/` and emit `manifest.json`.
- [x] Implement three SPA routes (`/`, `/proof/[runId]`, `/proof/[runId]/detail`) with simple Vue components and vanilla CSS.
- [x] Add Moon project/tasks for `ui` and wire into workspace validation/test orchestration.
- [x] Add `ui/wrangler.jsonc` for Cloudflare Worker static asset deployment with SPA fallback.
- [x] Update `README.md` with UI run/build/deploy instructions and data contract.

Evidence log:
- RED: `moon run poc:test` failed in new `poc/tests/ui-spa.spec.ts` because `ui/nuxt.config.ts`, `ui/wrangler.jsonc`, `ui/modules/proof-output-sync.ts`, and `ui/lib/proof-data.ts` do not exist yet (5 failing contract tests).
- GREEN: bootstrapped Nuxt app in `ui/` with `pnpm dlx nuxi@latest init ui --force --template minimal --packageManager pnpm --no-gitInit --no-install`.
- GREEN: `moon run poc:test` passed with new `poc/tests/ui-spa.spec.ts` contracts (`31/31` tests passing).
- GREEN: `moon run ui:test` passed (`ui/tests/ui-contracts.spec.ts`, `4/4` tests passing).
- GREEN: `moon run ui:validate` passed (`ui:test` + static SPA generation via `ui:generate`).
- GREEN: `moon run workspace:validate` passed with `ui:validate` included in workspace gates.
- GREEN: `moon run workspace:test` passed with `ui:test` included in workspace test orchestration.

### `T-211` UI reference parity hardening (Playwright-guided)
Status: `DONE`
Goal: align Nuxt SPA page structure, copy, and visual presentation with `ui/references/*.html` by inspecting live and reference screenshots using Playwright CLI.

RED checklist:
- [x] Add failing tests for reference parity copy/contracts on index, overview, and detail pages.
- [x] Add failing tests for reference baseline CSS tokens/layout primitives.

GREEN checklist:
- [x] Update page markup/classes to match reference hierarchy and labels.
- [x] Update global CSS to mirror reference visual language (grid background, spacing, typography, cards, badges, details sections).
- [x] Re-run Playwright screenshot pass for live vs reference comparison.
- [x] Re-run `moon run ui:test`, `moon run ui:validate`, and `moon run workspace:validate`.

Evidence log:
- RED: `moon run ui:test` failed in new `ui/tests/ui-reference-parity.spec.ts` (4 failing tests) because current pages/CSS do not yet match reference contracts (`PROOF_EXPLORER` branding, `Certificate Overview` breadcrumb copy, `Full Record` + privacy-layer section labels, and canonical grid theme tokens).
- GREEN: rewired page structures/copy in `ui/app/pages/index.vue`, `ui/app/pages/proof/[runId]/index.vue`, and `ui/app/pages/proof/[runId]/detail.vue` to match served reference hierarchy and labels.
- GREEN: rewrote `ui/app/assets/css/main.css` to the reference visual baseline (dark grid background, chip counters, bordered table, centered overview hero card, and detail accordion styling).
- GREEN: Playwright CLI screenshot pass executed against live Nuxt routes and served references:
  - `npx playwright screenshot --viewport-size=1280,720 --wait-for-timeout=2000 http://localhost:3000/ /tmp/ui-parity/live-index.png`
  - `npx playwright screenshot --viewport-size=1280,720 --wait-for-timeout=2000 http://localhost:3000/proof/2026-02-19T04-24-17 /tmp/ui-parity/live-overview.png`
  - `npx playwright screenshot --viewport-size=1280,720 --wait-for-timeout=2000 http://localhost:3000/proof/2026-02-19T04-24-17/detail /tmp/ui-parity/live-detail.png`
  - `npx playwright screenshot --viewport-size=1280,720 http://localhost:4174/index.html /tmp/ui-parity/ref-index.png`
  - `npx playwright screenshot --viewport-size=1280,720 http://localhost:4174/proof-overview.html /tmp/ui-parity/ref-overview.png`
  - `npx playwright screenshot --viewport-size=1280,720 http://localhost:4174/proof-detail.html /tmp/ui-parity/ref-detail.png`
- GREEN: `moon run ui:test` passed (`ui/tests/ui-reference-parity.spec.ts` and `ui/tests/ui-contracts.spec.ts`, `8/8` tests passing).
- GREEN: `moon run ui:validate` passed (`ui:test` + `ui:generate`).
- GREEN: `moon run workspace:validate` passed with `ui:validate` and workspace validation gates green.

### `T-212` Ineligible-user full pipeline task
Status: `BLOCKED`
Goal: add a dedicated Moon task that executes the full pipeline in an ineligible-user scenario and validates that proving is rejected by eligibility constraints.
Blocker: workspace-level validation is red due unrelated UI regressions tracked under `T-213`.

RED checklist:
- [x] Add failing tests for workspace Moon task wiring to an ineligible pipeline runner.
- [x] Add failing tests for expected prove-stage rejection handling in the ineligible runner.
- [x] Add failing tests for mock-server ineligible employee fixture contract.

GREEN checklist:
- [x] Implement mock-server ineligible employee endpoint fixture.
- [x] Implement ineligible pipeline runner script and Moon task wiring.
- [x] Update operator docs for the new negative-flow task.
- [ ] Re-run relevant tests/validation and keep baseline green.

Evidence log:
- RED: `moon run mock-server:test` failed in `mock-server/tests/server.spec.ts` because `INELIGIBLE_EMPLOYEE_RECORD` is not yet exported from `mock-server/server.ts`.
- RED: `moon run poc:test` failed in `poc/tests/run-poc-ineligible.spec.ts` because `moon.yml` does not define `run-ineligible` and `run-poc-ineligible.sh` does not exist yet.
- GREEN: implemented ineligible fixture routing in `mock-server/server.ts` with exported `INELIGIBLE_EMPLOYEE_RECORD` (`EMP-002`, salary `49000`) and dynamic `/api/v1/employee/:id` selection.
- GREEN: added `run-poc-ineligible.sh` wrapper to run `run-poc.sh` with `TLSN_ENDPOINT=/api/v1/employee/EMP-002`, require failure at `poc:prove`, and assert eligibility rejection diagnostics.
- GREEN: wired workspace task `run-ineligible` in `moon.yml` and documented command usage in `README.md`.
- GREEN: `moon run mock-server:test` passed.
- GREEN: `moon run poc:test` passed (including `poc/tests/run-poc-ineligible.spec.ts`).
- GREEN: `moon run workspace:run-ineligible` passed end-to-end and reported expected prove-stage rejection `salary 49000 is below required minimum 50000`.
- GREEN: `moon run workspace:validate` failed on unrelated `ui/tests/ui-contracts.spec.ts` regressions tracked in `T-213`; this task remains blocked on workspace-wide green gate.

### `T-213` UI data correctness and footer pass
Status: `DONE`
Goal: resolve live QA defects in the UI by rendering full timestamps, eliminating placeholder/unknown proof artifacts, adding ZekoScan links, replacing placeholder timeline times, and adding a footer.

RED checklist:
- [x] Add failing tests for datetime rendering and proof-hash derivation contract.
- [x] Add failing tests for incomplete run exclusion during output sync (unknown-only run removal).
- [x] Add failing tests for ZekoScan links and app footer presence.
- [x] Add failing tests for non-placeholder timeline timestamps.

GREEN checklist:
- [x] Implement datetime rendering in Directory rows.
- [x] Implement proof-hash derivation from artifact content instead of placeholder commitment fallback.
- [x] Exclude incomplete runs in sync logic and remove existing incomplete source/output run.
- [x] Add ZekoScan account/transaction links in Full Record on-chain section.
- [x] Compute run-relative timeline timestamps from run identifier instead of fixed placeholders.
- [x] Add application footer across SPA pages.
- [x] Re-run `moon run ui:test`, `moon run ui:validate`, and `moon run workspace:validate`.

Evidence log:
- RED: `moon run ui:test` failed in `ui/tests/ui-contracts.spec.ts` with 6 failing tests: run-id datetime formatting still returns date-only (`2026-02-19`), missing `deriveProofArtifactHash`, missing `selectCompleteTimestampRunDirs`, missing ZekoScan links in `ui/app/pages/proof/[runId]/detail.vue`, missing `buildPipelineTimeline`, and missing footer markup in `ui/app/app.vue`.
- GREEN: implemented run completeness filtering in `ui/modules/proof-output-sync.ts` via `selectCompleteTimestampRunDirs` requiring `attestation.json`, `disclosed-fields.json`, `proof.json`, and `verification-key.json`.
- GREEN: implemented datetime and non-placeholder hash derivation in `ui/lib/proof-data.ts` via `runIdToDateLabel` full timestamp formatting and `deriveProofArtifactHash` (SHA-256 of proof artifact text).
- GREEN: implemented timeline generation in `ui/lib/proof-data.ts` via `buildPipelineTimeline(runId)` with run-relative stage timestamps (replacing fixed placeholder constants in route usage).
- GREEN: removed incomplete source run directories (`output/2026-02-19T03-59-59` and `output/2026-02-20T06-11-06`) and ensured copied data excludes incomplete runs.
- GREEN: added ZekoScan links for on-chain account and transaction values in `ui/app/pages/proof/[runId]/detail.vue` (`https://zekoscan.io/testnet/account/...`, `https://zekoscan.io/testnet/tx/...`) and link rendering support in `ui/app/components/KeyValueGrid.vue`.
- GREEN: added app footer chrome in `ui/app/app.vue` and styling in `ui/app/assets/css/main.css`.
- GREEN: `moon run ui:test` passed (`ui/tests/ui-reference-parity.spec.ts` and `ui/tests/ui-contracts.spec.ts`, `14/14` tests passing).
- GREEN: `moon run ui:validate` passed (`ui:test` + `ui:generate`).
- GREEN: `moon run workspace:validate` passed with workspace validation gates green.

### `T-214` Ineligible output parsing in UI
Status: `DONE`
Goal: ensure UI sync + parsing includes ineligible runs that only emit `attestation.json` and `disclosed-fields.json`, while still excluding noise-only runs.

RED checklist:
- [x] Add failing tests for sync selection that includes ineligible artifact sets (`attestation + disclosed-fields`) and excludes log-only directories.
- [x] Add failing tests for UI status derivation to classify ineligible runs as `failed` when proof output is absent but disclosed fields are present.

GREEN checklist:
- [x] Update output sync selection contract to include ineligible artifact sets.
- [x] Update proof-data status derivation to mark ineligible outputs as `failed`.
- [x] Re-run `moon run ui:test`, `moon run ui:validate`, and `moon run workspace:validate`.

Evidence log:
- RED: `moon run ui:test` failed in `ui/tests/ui-contracts.spec.ts` with 2 expected failures: `selectCompleteTimestampRunDirs` currently excludes ineligible runs (`attestation.json` + `disclosed-fields.json` only), and `deriveRunStatus` is not implemented/exported for ineligible status classification.
- GREEN: updated `ui/modules/proof-output-sync.ts` so `selectCompleteTimestampRunDirs` accepts timestamp runs with minimum renderable artifacts (`attestation.json` + `disclosed-fields.json`) while still excluding noise-only directories.
- GREEN: added `deriveRunStatus` in `ui/lib/proof-data.ts` and wired it into `loadRunSummary` and `loadProofRecord` to classify missing-proof + disclosed-fields runs as `failed`.
- GREEN: `moon run ui:test` passed (`15/15` tests).
- GREEN: `moon run ui:validate` passed.
- GREEN: `moon run workspace:validate` first failed with `ui:generate` `ENOTEMPTY` race while `ui:dev` was running, then passed after stopping `ui:dev` and rerunning validation.

### `T-215` Remove dead timeline export in UI data layer
Status: `DONE`
Goal: remove unused `PIPELINE_TIMELINE` export from `ui/lib/proof-data.ts` now that timeline rendering uses `buildPipelineTimeline(runId)` dynamically.

RED checklist:
- [x] Add failing test that guards against exporting unused static `PIPELINE_TIMELINE`.

GREEN checklist:
- [x] Remove static `PIPELINE_TIMELINE` export from proof-data module.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- RED: `moon run ui:test` failed in `ui/tests/ui-contracts.spec.ts` because `ui/lib/proof-data.ts` still exports `PIPELINE_TIMELINE` despite timeline rendering already using `buildPipelineTimeline(runId)` dynamically.
- GREEN: removed dead export `PIPELINE_TIMELINE` from `ui/lib/proof-data.ts`; dynamic timeline generation remains via `buildPipelineTimeline(runId)`.
- GREEN: `moon run ui:test` passed (`16/16` tests).
- GREEN: `moon run ui:validate` passed.

### `T-216` Reviewer follow-up: settlement metadata correctness + deterministic ineligible endpoint
Status: `DONE`
Goal: resolve reviewer findings by preventing deployment metadata from being displayed as settlement metadata and by forcing the ineligible endpoint during negative-flow runs.

RED checklist:
- [x] Add failing test showing `run-poc-ineligible.sh` must override inherited `TLSN_ENDPOINT` and force the ineligible endpoint.
- [x] Add failing UI test showing settlement transaction display/data does not source from `deploy_tx_hash`.

GREEN checklist:
- [x] Patch `run-poc-ineligible.sh` to always set `TLSN_ENDPOINT` from `TLSN_INELIGIBLE_ENDPOINT` (or its default).
- [x] Patch UI proof data/detail rendering to separate deployment tx metadata from settlement tx metadata.
- [x] Re-run `moon run poc:test`, `moon run ui:test`, `moon run ui:validate`, and `moon run workspace:validate`.

Evidence log:
- IN_PROGRESS: task opened to implement review findings `[P1]` and `[P2]`.
- RED: `moon run poc:test -- --run poc/tests/run-poc-ineligible.spec.ts -t "Given an inherited eligible endpoint When run-poc-ineligible.sh executes Then it overrides TLSN_ENDPOINT to the ineligible endpoint"` failed because output showed `endpoint: /api/v1/employee/EMP-001` (inherited env) instead of forced ineligible endpoint.
- RED: `moon run ui:test -- --run tests/ui-contracts.spec.ts -t "Given settlement metadata requirements When inspecting proof record contracts Then settlement tx data is not sourced from deploy_tx_hash"` failed because `ui/lib/proof-data.ts` does not read `settlement.json` and `ui/app/pages/proof/[runId]/detail.vue` still binds settlement display to deploy metadata.
- GREEN: patched `run-poc-ineligible.sh` to export `TLSN_ENDPOINT` unconditionally from `TLSN_INELIGIBLE_ENDPOINT` (default `/api/v1/employee/EMP-002`) so inherited environment values cannot redirect the negative flow.
- GREEN: patched `ui/lib/proof-data.ts` to load optional per-run `settlement.json` and derive `settlementTxHash`, and patched `ui/app/pages/proof/[runId]/detail.vue` to display `Settlement Tx Hash` from settlement metadata while labeling deployment metadata as `Deploy Tx Hash`.
- GREEN: `moon run poc:test -- --run poc/tests/run-poc-ineligible.spec.ts -t "Given an inherited eligible endpoint When run-poc-ineligible.sh executes Then it overrides TLSN_ENDPOINT to the ineligible endpoint"` passed.
- GREEN: `moon run ui:test -- --run tests/ui-contracts.spec.ts -t "Given settlement metadata requirements When inspecting proof record contracts Then settlement tx data is not sourced from deploy_tx_hash"` passed.
- GREEN: `moon run ui:test` passed (`17/17` tests).
- GREEN: `moon run ui:validate` passed.
- GREEN: temporary workspace blockage from `poc/tests/ui-spa.spec.ts` was cleared in follow-up task `T-218`; `moon run poc:test` and `moon run workspace:validate` now pass with reviewer-fix coverage intact.

### `T-217` Ineligible overview messaging + proof-field copy UX
Status: `DONE`
Goal: make ineligible certificate overview copy explicitly state non-eligibility, and replace proof-hash display with truncated full-proof text + copy-to-clipboard behavior while leaving proof empty for ineligible runs.

RED checklist:
- [x] Add failing tests for ineligible-specific overview copy.
- [x] Add failing tests for proof field copy UX contracts (`Copy Full Proof` + clipboard usage).
- [x] Add failing tests for ineligible proof field empty-state behavior and proof payload normalization contract.

GREEN checklist:
- [x] Implement ineligible conditional messaging in overview page.
- [x] Implement truncated full-proof display + copy button behavior.
- [x] Ensure ineligible status clears proof field values.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- RED: `moon run ui:test` failed in `ui/tests/ui-contracts.spec.ts` with 4 expected failures: missing `normalizeProofPayload` export, missing ineligible-specific overview copy (`does not satisfy eligibility policy requirements`), missing proof-field copy UX (`Copy Full Proof` + clipboard API usage), and missing `selectProofFieldValue` helper for empty ineligible proof-field behavior.
- GREEN: added proof payload helpers `normalizeProofPayload` and `selectProofFieldValue` in `ui/lib/proof-data.ts`; proof values now use normalized full-proof payload text and are explicitly empty for failed/ineligible status.
- GREEN: updated `ui/app/pages/proof/[runId]/index.vue` with ineligible-specific subtitle/card copy and proof-field copy UX (`Copy Full Proof` via `navigator.clipboard.writeText`).
- GREEN: updated `ui/app/components/KeyValueGrid.vue`, `ui/app/pages/proof/[runId]/detail.vue`, `ui/app/pages/index.vue`, and `ui/app/assets/css/main.css` for truncated proof display, copy controls, and empty ineligible proof-field rendering.
- GREEN: renamed UI labels from `Proof Hash` to `Proof` in directory, overview, and full-record views to match the full-proof (truncated) semantics.
- GREEN: `moon run ui:test` passed (`20/20` tests).
- GREEN: `moon run ui:validate` passed.

### `T-218` Wrangler contract test correction
Status: `DONE`
Goal: correct the `poc/tests/ui-spa.spec.ts` wrangler assertion so tests validate the currently supported worker/static config contract instead of requiring unsupported `assets.not_found_handling`.

RED checklist:
- [x] Reproduce failing wrangler contract test in `poc/tests/ui-spa.spec.ts`.

GREEN checklist:
- [x] Update `poc/tests/ui-spa.spec.ts` wrangler assertion to match current valid `ui/wrangler.jsonc`.
- [x] Re-run `moon run poc:test` and `moon run workspace:validate`.

Evidence log:
- IN_PROGRESS: task opened from user direction that the current `ui/wrangler.jsonc` is correct and test assumptions must be updated.
- RED: `moon run poc:test -- --run poc/tests/ui-spa.spec.ts -t "Given Cloudflare Worker static deployment requirements When inspecting wrangler config Then SPA asset fallback is configured"` failed because the test requires `"not_found_handling": "single-page-application"` while `ui/wrangler.jsonc` intentionally defines only `assets.binding` and `assets.directory` with the current Nuxt worker/static setup.
- GREEN: updated `poc/tests/ui-spa.spec.ts` wrangler contract to assert current valid fields (`main`, `assets.binding`, and `assets.directory`) and removed the unsupported `not_found_handling` assumption.
- GREEN: `moon run poc:test` passed (`35/35` tests).
- GREEN: `moon run workspace:validate` passed.

### `T-219` UI parity polish for ineligible/eligible state handling + page-local CSS + typecheck gate
Status: `DONE`
Goal: align overview and detail UX contracts for eligible vs ineligible proof states, simplify proof-copy affordance, fix directory row alignment edge-cases, replace timeline timestamps with status-aware ordered steps, move per-page CSS into page-local style blocks, and ensure UI typecheck is enforced via Moon.

RED checklist:
- [x] Add failing UI contract tests for status-aware overview card highlighting and CTA style contract.
- [x] Add failing UI contract tests for clipboard-icon proof-copy affordance and proof label usage.
- [x] Add failing UI contract tests for ordered pipeline list contract (no timestamps) with ineligible-specific steps.
- [x] Add failing UI contract tests that assert per-page `<style>` blocks in route components.
- [x] Add failing Moon/UI config tests that assert `ui:typecheck` exists and is part of `ui:validate`.

GREEN checklist:
- [x] Patch overview page card states, CTA styling, and proof copy icon interaction.
- [x] Patch directory row layout for stable alignment across failed/ineligible rows.
- [x] Replace detail timeline component usage with ordered list content that branches by eligibility status.
- [x] Move page-level CSS from global stylesheet into per-page style blocks.
- [x] Add Moon target for `ui:typecheck` and include it in validation.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- IN_PROGRESS: task opened for requested UI parity and maintainability pass.
- RED: `moon run ui:test` failed with 9 expected failures across `ui/tests/ui-reference-parity.spec.ts` and `ui/tests/ui-contracts.spec.ts`: missing uppercase centered CTA copy, missing status-aware trust-card tone logic, missing icon-only proof-copy button contract, detail page still using timestamp timeline component instead of ordered steps (including missing ineligible-step copy), missing per-page `<style>` blocks with page selectors still in `ui/app/assets/css/main.css`, and missing `ui:typecheck` task dependency in `ui/moon.yml`.
- GREEN: updated `ui/app/pages/proof/[runId]/index.vue` with status-aware trust-card border tones (eligible: all green, ineligible: card 1 green and cards 2/3 red), icon-only clipboard copy button, and centered uppercase CTA styling.
- GREEN: updated `ui/app/pages/index.vue` grid tracks to fixed `minmax(0, ...)` column sizing for deterministic row alignment across eligible/ineligible rows and moved directory CSS into a page-local `<style>` block.
- GREEN: updated `ui/app/pages/proof/[runId]/detail.vue` to remove timestamp timeline rendering and replace section 6 with ordered pipeline steps that branch for ineligible runs (including explicit proof-skip and failure-artifact retention steps).
- GREEN: moved component/page CSS out of `ui/app/assets/css/main.css` into local style blocks (`ui/app/pages/index.vue`, `ui/app/pages/proof/[runId]/index.vue`, `ui/app/pages/proof/[runId]/detail.vue`, `ui/app/app.vue`, `ui/app/components/StatusBadge.vue`, `ui/app/components/KeyValueGrid.vue`, `ui/app/components/ArtifactLinks.vue`) and deleted unused `ui/app/components/PipelineTimeline.vue`.
- GREEN: added `ui:typecheck` task in `ui/moon.yml` (`pnpm exec nuxi typecheck`), wired `ui:validate` dependencies to include `ui:typecheck`, and set `tasks.validate.options.runDepsInParallel: false` to avoid proof-output sync races between `ui:typecheck` and `ui:generate`.
- GREEN: `moon run ui:test` passed (`26/26` tests).
- GREEN: `moon run ui:validate` initially failed with sync races (`ENOENT`/`ENOTEMPTY` in `ui/public/proof-data`) while deps executed concurrently, then passed after serializing validate deps (`ui:test`, `ui:typecheck`, `ui:generate`).

### `T-220` Proof semantics follow-up: attestation full values + proof-property preview
Status: `DONE`
Goal: clarify tx-hash semantics in detail output context, show full notary key/signature values with line breaks (no truncation), and make certificate/detail proof preview derive from the proof property instead of the full JSON object.

RED checklist:
- [x] Add failing tests for proof-preview extraction from proof payload property.
- [x] Add failing tests for detail attestation field rendering without truncation.
- [x] Add failing tests for multiline rendering support in key-value rows.

GREEN checklist:
- [x] Implement proof-property extraction in UI data layer and wire preview/copy values.
- [x] Remove notary key and ECDSA signature truncation and format values with line breaks.
- [x] Update key-value rendering styles to preserve multiline line-breaks.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- IN_PROGRESS: task opened for requested proof semantics and detail attestation formatting corrections.
- RED: `moon run ui:test` failed with 3 expected failures in `ui/tests/ui-contracts.spec.ts`: missing `extractProofPreviewValue` helper export for proof-property sourcing, detail attestation still truncates notary key and signature via `.slice(...)`, and `ui/app/components/KeyValueGrid.vue` does not preserve multiline values (`class="kv-text"` + `white-space: pre-wrap` missing).
- GREEN: added `extractProofPreviewValue` and `extractProofPublicOutput` in `ui/lib/proof-data.ts`; `loadRunSummary` and `loadProofRecord` now source proof preview/copy data from the proof payload property (`proof.proof` preferred, serialized `proof` object fallback) while preserving ineligible empty-state via `selectProofFieldValue`.
- GREEN: updated `ui/app/pages/proof/[runId]/detail.vue` attestation entries to render full notary key/signature values (`x/y` and `r/s`) on separate lines without truncation.
- GREEN: updated `ui/app/components/KeyValueGrid.vue` with `kv-text` multiline rendering (`white-space: pre-wrap`) so long detail values wrap naturally in expanded sections.
- GREEN: `moon run ui:test` passed (`29/29` tests).
- GREEN: `moon run ui:validate` passed (`ui:test`, `ui:typecheck`, `ui:generate`).

### `T-221` Directory proof-slice readability + duplicate run dedupe
Status: `DONE`
Goal: ensure homepage proof previews visibly show both prefix and suffix segments, and eliminate duplicate run entries when duplicate timestamp run IDs are encountered.

RED checklist:
- [x] Add failing tests for duplicate complete-run dedupe behavior in output-sync selection.
- [x] Add failing tests for homepage proof rendering contract that shows explicit prefix/suffix slices.

GREEN checklist:
- [x] Implement duplicate run-id dedupe in output-sync selection.
- [x] Implement directory proof-slice rendering that preserves visible prefix and suffix segments.
- [x] Remove duplicated source run entry when duplicate timestamp directories are detected.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- IN_PROGRESS: task opened for homepage proof readability and duplicate run cleanup request.
- RED: `moon run ui:test` failed with 2 expected failures in `ui/tests/ui-contracts.spec.ts`: `selectCompleteTimestampRunDirs` currently returns duplicate IDs when duplicate complete run entries are present, and `ui/app/pages/index.vue` still uses single-string truncation instead of explicit prefix/suffix proof slices.
- GREEN: updated `ui/modules/proof-output-sync.ts` so `selectCompleteTimestampRunDirs` dedupes run IDs using a `Set` before sorting, preventing duplicate run entries from being copied/rendered.
- GREEN: updated `ui/app/pages/index.vue` proof rendering to split previews into explicit `proof-prefix ... proof-suffix` segments (`splitProofValue`) instead of a single ellipsized string.
- GREEN: scanned `output/` timestamp directories for duplicate timestamps and executed cleanup routine; current dataset contains no duplicate timestamps (`duplicates: []`, `removed: []`), so no source directory deletion was required.
- GREEN: `moon run ui:test` passed (`31/31` tests).
- GREEN: `moon run ui:validate` passed (`ui:test`, `ui:typecheck`, `ui:generate`).

### `T-222` Directory proof availability indicator (`✓` / `✕`)
Status: `DONE`
Goal: replace directory proof text previews with a simple proof-presence indicator (`✓`) and proof-absence indicator (`✕`) for clearer scanability.

RED checklist:
- [x] Add failing tests for directory proof availability marker rendering.

GREEN checklist:
- [x] Replace proof split/truncation rendering in directory rows with availability symbols.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- IN_PROGRESS: task opened for directory proof indicator simplification.
- RED: `moon run ui:test` failed in `ui/tests/ui-contracts.spec.ts` because `ui/app/pages/index.vue` still renders split proof text and does not yet contain the proof availability marker contract (`run.proofHash ? "✓" : "✕"` with `proof-indicator` states).
- GREEN: updated `ui/app/pages/index.vue` to replace proof split preview rendering with an availability marker (`✓` when `run.proofHash` is present, `✕` when absent) using `proof-indicator.is-present` / `proof-indicator.is-missing` styles.
- GREEN: removed obsolete `splitProofValue` proof-slice helper and related split-preview markup/styles from the directory page.
- GREEN: `moon run ui:test` passed (`31/31` tests).
- GREEN: `moon run ui:validate` passed (`ui:test`, `ui:typecheck`, `ui:generate`).

### `T-223` Directory proof-column removal + mobile layout refinement
Status: `DONE`
Goal: remove the proof column entirely from directory view and improve mobile row readability with clearer per-field labeling and card-style row treatment.

RED checklist:
- [x] Add failing tests asserting proof column/indicator removal from directory markup.
- [x] Add failing tests asserting improved mobile row layout hooks/styles exist.

GREEN checklist:
- [x] Remove proof header/cell rendering and related styles from `ui/app/pages/index.vue`.
- [x] Improve mobile layout with field labels and row card styling for easier scanability.
- [x] Re-run `moon run ui:test` and `moon run ui:validate`.

Evidence log:
- IN_PROGRESS: task opened for requested directory proof-column removal and mobile layout improvements.
- RED: `moon run ui:test` failed with 2 expected contract failures in `ui/tests/ui-contracts.spec.ts` because directory markup still exposed proof-specific contracts and lacked the requested mobile layout hooks/styles.
- GREEN: updated `ui/app/pages/index.vue` to remove the proof column entirely, keep a four-column grid (`status/circuit/date/network`), and render mobile field labels + card-style row treatment at `@media (max-width: 1024px)`.
- GREEN: `moon run ui:test` passed (`32/32` tests).
- GREEN: `moon run ui:validate` passed (`ui:test`, `ui:typecheck`, `ui:generate`).

### `T-224` Reviewer follow-up: deploy task build dependency + deterministic ineligible dotenv override
Status: `DONE`
Goal: resolve review findings by making `ui:deploy` runnable from the documented sequence and ensuring `workspace:run-ineligible` always targets the ineligible endpoint even when `.env` defines `TLSN_ENDPOINT`.

RED checklist:
- [x] Add failing test for `ui:deploy` task contract requiring `ui:build` dependency before wrangler deploy.
- [x] Add failing test for ineligible runner behavior when pipeline dotenv loading overrides `TLSN_ENDPOINT`.
- [x] Add failing test for `run-poc.sh` contract supporting post-dotenv endpoint override.

GREEN checklist:
- [x] Patch `ui/moon.yml` so `ui:deploy` depends on `ui:build`.
- [x] Patch ineligible endpoint override flow to reapply after dotenv loading in pipeline startup.
- [x] Re-run targeted tests and workspace validation gate.

Evidence log:
- IN_PROGRESS: task opened from review findings `[P1]` (deploy entrypoint missing after `ui:generate`) and `[P2]` (ineligible endpoint override not deterministic when `.env` defines `TLSN_ENDPOINT`).
- RED: `moon run poc:test -- --run poc/tests/ui-spa.spec.ts -t "Given deploy workflow requirements When inspecting ui Moon tasks Then ui:deploy depends on ui:build"` failed because `ui/moon.yml` defines `ui:deploy` without a `deps` entry for `ui:build`.
- RED: `moon run poc:test -- --run poc/tests/run-poc.spec.ts poc/tests/run-poc-ineligible.spec.ts -t "(Given endpoint override requirements When inspecting run-poc.sh Then dotenv loading can be followed by a TLSN endpoint override|Given dotenv loading rewrites TLSN_ENDPOINT When run-poc-ineligible.sh executes Then the ineligible override is reapplied for the pipeline)"` failed because `run-poc.sh` has no `RUN_POC_TLSN_ENDPOINT_OVERRIDE` contract and the ineligible wrapper output still showed `endpoint:/api/v1/employee/EMP-001` after dotenv loading in the pipeline stub.
- GREEN: patched `ui/moon.yml` so `ui:deploy` now depends on `ui:build`, ensuring Wrangler’s `./.output/server/index.mjs` entrypoint exists in the documented deploy flow.
- GREEN: patched `run-poc-ineligible.sh` to export `RUN_POC_TLSN_ENDPOINT_OVERRIDE` alongside `TLSN_ENDPOINT`, and patched `run-poc.sh` to reapply `TLSN_ENDPOINT` from `RUN_POC_TLSN_ENDPOINT_OVERRIDE` after `.env` loading.
- GREEN: `moon run poc:test -- --run poc/tests/ui-spa.spec.ts -t "Given deploy workflow requirements When inspecting ui Moon tasks Then ui:deploy depends on ui:build"` passed.
- GREEN: `moon run poc:test -- --run poc/tests/run-poc.spec.ts poc/tests/run-poc-ineligible.spec.ts -t "(Given endpoint override requirements When inspecting run-poc.sh Then dotenv loading can be followed by a TLSN endpoint override|Given dotenv loading rewrites TLSN_ENDPOINT When run-poc-ineligible.sh executes Then the ineligible override is reapplied for the pipeline)"` passed.
- GREEN: `moon run workspace:validate` passed with `poc:test`, `ui:validate`, `mock-server:test`, and `tlsnotary:test` green.
