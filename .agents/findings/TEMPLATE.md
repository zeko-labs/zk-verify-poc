# zkVerify PoC Findings Template

## Environment Snapshot
- Date: 2026-02-18 18:09:21 UTC
- Machine: Darwin arm64 (`Darwin Emmanuels-MacBook-Air.local 25.0.0`)
- Node: `v25.6.1`
- pnpm: `10.30.0`
- Rust: `rustc 1.93.1 (01f6ddf75 2026-02-11)`
- OpenSSL: `OpenSSL 3.6.1 27 Jan 2026`
- o1js version: `2.13.0`
- TLSNotary crate versions: workspace path deps from `vendor/tlsn` (`tlsn`, `tlsn-formats`)

## End-to-End Result
- Pipeline status: PASS
- Total duration: `74.63s` (`/usr/bin/time -p moon run workspace:run`)
- Final result: ELIGIBLE

## Known Unknowns Resolution Matrix

### 1) TLSNotary secp256k1 API availability
- Evidence:
  - `output/attestation.json` contains `"signature_alg": "secp256k1"`.
  - `tlsnotary/src/bin/notary.rs` enforces `SignatureAlgId::SECP256K1` support in provider.
  - Successful local runs produced secp256k1 signature + public key coordinates for proof input.
- Result: Available and usable in the current vendored TLSNotary workspace.
- Impact: Primary in-circuit ECDSA verification path is viable (no fallback required).

### 2) TLSNotary <-> o1js signature format compatibility
- Evidence:
  - `output/attestation.json` provides compact `r_hex`/`s_hex` and secp256k1 `x_hex`/`y_hex`.
  - `moon run poc:prove` succeeded with in-circuit `verifySignedHash`.
  - `moon run poc:verify` returned `Proof valid: true`.
- Result: Compatible when using compact `(r, s)` + SHA-256(session-header-bytes) semantics.
- Impact: No DER conversion layer required in the final proving path.

### 3) Self-signed certificate compatibility
- Evidence:
  - Repeated successful `tlsnotary:notary` + `tlsnotary:prover` runs against `https://localhost:4443`.
  - Root cert loaded from `mock-server/cert.pem` and accepted by TLSNotary flow.
- Result: Compatible for local PoC with explicit root-store wiring.
- Impact: Local deterministic integration remains simple without external CA dependencies.

### 4) TLS 1.2 enforcement compatibility
- Evidence:
  - `mock-server/server.ts` enforces `minVersion=maxVersion=TLSv1.2`.
  - Attestation/proof pipeline succeeds end-to-end with current server settings.
- Result: TLS 1.2 enforcement works with current TLSNotary MPC-TLS handshake.
- Impact: No Rust-server fallback needed for TLS version compatibility in this PoC.

### 5) Zeko testnet + o1js compatibility
- Evidence:
  - Deploy submit hash: `5JuwtV5ihXuAqgEKZxWCcPGbKZr2gd7aGxcUPp3Vv4fW5DRKuMx9`
  - Settle confirmed hash: `5JvAqXUdeYupezQBAJmeZPKm5YEZsMcnzbviu3QvhYjxp3vvkUa6`
  - End-to-end runner settle hash: `5Jv8ZTJ359Rgbk8hisSvfTtQJHrxANFndsZFECRyKdigaNTbSJpu`
  - Explorer: `https://zekoscan.io/testnet/tx/5Jv8ZTJ359Rgbk8hisSvfTtQJHrxANFndsZFECRyKdigaNTbSJpu`
- Result: Compatible with current o1js when contract is compiled in-process and transaction confirmation uses account-nonce polling.
- Impact: `pendingTx.wait()` and `transactionStatus` are not usable against current Zeko GraphQL schema; keep nonce-based confirmation.

### 6) Combined circuit performance
- Compile time: included in `moon run poc:prove` stage timing (not separately instrumented in script output).
- Prove time: included in `moon run poc:prove` stage timing (not separately instrumented in script output).
- Total stage time: `30.786s` (`poc:prove` in successful `workspace:run`).
- Impact: Combined ECDSA + eligibility proof stage stayed within the PoC budget and did not require recursive split.

### 7) Session header serialization certainty
- Signed bytes source: `header_bytes = bcs::to_bytes(&attestation.header)` in `tlsnotary/src/bin/prover.rs`.
- Encoding details: raw BCS-serialized session header bytes persisted as `session_header_bytes_hex`.
- Hashing details: o1js circuit computes `Hash.SHA2_256.hash(sessionHeaderBytes)` and verifies secp256k1 signature against that digest.
- Confidence: High for current integration (successful in-circuit verification + local proof verification), medium for long-term portability across upstream serialization changes.

## Pass/Fail Criteria
- [x] Criterion 1: TLSNotary secp256k1 attestation generated
- [x] Criterion 2: In-circuit secp256k1 verification succeeds
- [x] Criterion 3: Eligibility logic proof generation succeeds
- [x] Criterion 4: Local proof verification returns true
- [x] Criterion 5: Settlement transaction confirms on Zeko
- [x] Criterion 6: End-to-end runtime under target threshold

## Workarounds Needed
- Item: Replace `pendingTx.wait()` with fee-payer nonce polling via `fetchAccount`.
- Why: Current Zeko GraphQL schema does not expose the query fields expected by o1js wait/status helpers (`bestChain`, `transactionStatus`).
- Cost: Low implementation cost; medium maintenance cost if upstream schema or SDK behavior changes.
- Item: Compile `VerificationRegistry` inside `settle.ts` before proving transaction.
- Why: Prover cache is process-local and `settle.ts` is run independently from deploy/prove scripts.
- Cost: Moderate runtime cost (extra compile before settlement).

## Blockers
- Blocker: None for PoC acceptance criteria.
- Reproduction: N/A
- Recommended next step: Keep monitoring Zeko GraphQL compatibility with future o1js releases.

## Recommended Version Pins
- o1js: `2.13.0`
- tlsn-prover: pin via `vendor/tlsn` submodule commit `c55853b3` (workspace crate set)
- tlsn-core: pin via `vendor/tlsn` submodule commit `c55853b3` (workspace crate set)
- tlsn-verifier: pin via `vendor/tlsn` submodule commit `c55853b3` (workspace crate set)
- node: `25.6.1`
- pnpm: `10.30.0`

## Go/No-Go Assessment
- Confirmed:
  - TLSNotary secp256k1 attestation generation succeeds against TLS 1.2 mock server.
  - In-circuit secp256k1 verification + eligibility checks produce valid o1js proofs.
  - Proof verification and Zeko settlement execute successfully in CLI pipeline.
- Workarounds needed:
  - Zeko confirmation must use nonce polling instead of o1js wait/status helpers.
  - Settlement script must compile contract in-process before proving.
- Blockers:
  - No hard blockers for MVP cryptographic path.
- Recommendation: GO for MVP with the pinned versions and documented workarounds.
