# AGENTS.md

## Mission
Implement the zkVerify PoC as a CLI-first cryptographic validation pipeline with strict in-circuit ECDSA verification.

## Delivery Rules
- Use Red/Green TDD for every feature:
  1. RED: write failing tests first.
  2. GREEN: implement minimal code to pass.
  3. REFACTOR: improve structure without changing behavior.
- Use BDD naming in tests:
  - `Given ... When ... Then ...`
- Keep moon tasks and implementation tracking separate:
  - `TASKLIST.md` is the execution plan/status source of truth.
  - moon tasks are command runners only.
- Update `TASKLIST.md` before and after implementing any major step.

## Security and Secrets
- Never commit private keys.
- Keep `.env` and private key files git-ignored.
- Allowed committed artifacts:
  - templates (`.env.example`)
  - public/non-sensitive generated files

## Hard Constraints
- Full ECDSA path only; no automatic fallback execution.
- Fail fast with clear diagnostics when secp256k1 attestation assumptions are not met.

## Repo Conventions
- TypeScript for scripts/circuits/contracts/mock server.
- Rust for TLSNotary binaries.
- `pnpm` via `proto` for JS dependencies.
- `moon` for task orchestration.
