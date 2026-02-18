# zkverify-poc

CLI-based PoC to validate zkTLS -> ZK proof -> Zeko settlement.

## Start Here (for a new agent)
1. `AGENTS.md`
2. `TASKLIST.md`
3. `PRD.md`
4. `.agents/findings/TEMPLATE.md`

Current active work item: `T-201` in `TASKLIST.md`.

## Requirements
- `proto` (tool manager)
- `moon` (task runner)
- Rust stable
- OpenSSL

## Toolchain bootstrap (latest)
```bash
proto install node latest --pin local -y
proto install pnpm latest --pin local -y
moon --version
```

## Clone and initialize submodules
```bash
git submodule update --init --recursive
```

## Workspace dependency model
- This repo is a pnpm workspace.
- The PoC Node package lives at `poc/package.json`.
- Versions are pinned via pnpm catalog in `pnpm-workspace.yaml`.

Moon installs dependencies automatically when running tasks (`pipeline.installDependencies: true` in `.moon/workspace.yml`).

## Baseline health checks
Run these before starting new work:
```bash
moon run workspace:validate
```

## Generate local keys and `.env`
```bash
moon run poc:gen-wallet
```

Then fund `FEE_PAYER_PUBLIC_KEY`:
- https://zeko.io/faucet

## Environment
Required values in `.env`:
- `ZEKO_GRAPHQL_URL=https://testnet.zeko.io/graphql`
- `FEE_PAYER_PRIVATE_KEY=...`
- `FEE_PAYER_PUBLIC_KEY=...`
- `TLSNOTARY_SIGNING_KEY_HEX=...`

Optional:
- `ZKAPP_PRIVATE_KEY=...`
- `ZKAPP_PUBLIC_KEY=...`

## Main workflow
Run end-to-end:
```bash
moon run workspace:run
```

Or run by stage:
```bash
moon run mock-server:serve
moon run tlsnotary:notary
moon run tlsnotary:prover
moon run poc:extract
moon run poc:prove
moon run poc:verify
moon run poc:deploy
moon run poc:settle
```

## Moon project layout
- `workspace` (repo orchestration): install, validate, run
- `poc` (TS proving/settlement): tests, typecheck, lint, format, extract/prove/verify/deploy/settle
- `mock-server` (HTTPS fixture): serve + tests
- `tlsnotary` (Rust notary/prover): build/test/notary/prover

## Test locations
- `poc/tests/*.spec.ts`
- `mock-server/tests/*.spec.ts`
- Rust unit tests inside `tlsnotary/src/*`

## Project structure notes
- `poc/contracts/` and `poc/circuits/` are intentionally colocated inside the `poc` package (no orphan root `contracts/` directory).

## Repo-local skills
Required local skills are vendored in:
- `.agents/skills/proto`
- `.agents/skills/moon`

See `.agents/skills/README.md` to refresh them.

## Outputs
Artifacts are generated under `output/`:
- `attestation.json`
- `disclosed-fields.json`
- `proof.json`
- `verification-key.json`
- `deployed-address.json`

## Security
- Private keys are local-only and git-ignored.
- Never commit `.env` or private key files.
