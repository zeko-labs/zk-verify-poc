# TASKLIST

Status legend: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`

## 0. Bootstrap and governance
- [x] DONE Initialize repo/toolchain (`proto`, `pnpm`, `moon`) and baseline configs
- [x] DONE Author `PRD.md`, `AGENTS.md`, `README.md`, `.agents/findings/TEMPLATE.md`
- [x] DONE Configure strict `.gitignore` and `.env.example`
- [x] DONE Add TLSNotary upstream as git submodule (`vendor/tlsn`)

## 1. Mock server (TDD)
- [x] DONE RED: tests for TLS1.2-only server and employee endpoint payload
- [x] DONE GREEN: implement `mock-server/server.ts`
- [ ] TODO REFACTOR: improve startup ergonomics and logs

## 2. TLSNotary attestation (TDD)
- [x] DONE RED: helper tests for signature/key normalization
- [x] DONE GREEN: implement `tlsnotary/src/bin/notary.rs` and `prover.rs`
- [ ] TODO REFACTOR: error messages for signature/session-header incompatibility

## 3. Extraction bridge (TDD)
- [x] DONE RED: tests for field extraction and commitment hashing
- [x] DONE GREEN: implement `scripts/extract-fields.ts`
- [ ] TODO REFACTOR: input validation and deterministic serialization

## 4. Circuit and proving (TDD)
- [ ] IN_PROGRESS RED: tests for eligibility constraints and tamper failures
- [x] DONE GREEN: implement `circuits/eligibility.ts`, `scripts/prove.ts`, `scripts/verify.ts`
- [ ] TODO REFACTOR: isolate encoding adapters for ECDSA input types

## 5. Zeko settlement (TDD)
- [ ] TODO RED: tests for env loading and transaction payload creation
- [x] DONE GREEN: implement `contracts/VerificationRegistry.ts`, `scripts/deploy.ts`, `scripts/settle.ts`
- [ ] TODO REFACTOR: improve transaction logging and explorer URLs

## 6. Orchestration and evidence
- [ ] TODO RED: script-level test/smoke checks for stage sequencing
- [x] DONE GREEN: implement `run-poc.sh` and moon task wiring
- [ ] TODO REFACTOR: cleanup handling and stage timing logs
- [ ] TODO Fill `.agents/findings/TEMPLATE.md` with run evidence
