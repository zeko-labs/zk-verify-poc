# zkverify-poc

CLI-based PoC to validate zkTLS -> ZK proof -> Zeko settlement.

## Requirements
- `proto` (tool manager)
- `moon` (task runner)
- Rust stable
- OpenSSL

## Toolchain bootstrap (latest)
```bash
proto install node latest --pin local -y
proto install pnpm latest --pin local -y
pnpm -v
node -v
moon --version
```

## Clone and initialize submodules
```bash
git submodule update --init --recursive
```

## Install JS dependencies
```bash
pnpm install
```

## Generate local keys and .env
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
moon run poc:run
```

Or run by stage:
```bash
moon run poc:serve-mock
moon run tlsnotary:notary
moon run tlsnotary:prover
moon run poc:extract
moon run poc:prove
moon run poc:verify
moon run poc:deploy
moon run poc:settle
```

## Outputs
Artifacts are generated under `output/`:
- `attestation.json`
- `disclosed-fields.json`
- `proof.json`
- `verification-key.json`
- `deployed-address.json`

## Troubleshooting
- TLS handshake/version errors:
  - Confirm mock server is TLS 1.2 only.
- Attestation format mismatch:
  - Ensure `signature.r_hex/s_hex`, `session_header_bytes_hex`, `notary_public_key.x_hex/y_hex` exist.
- Proof generation fails:
  - Confirm session header bytes are present and not truncated.
- Zeko tx fails:
  - Confirm fee payer is funded and GraphQL endpoint is reachable.

## Security
- Private keys are local-only and git-ignored.
- Never commit `.env` or private key files.
