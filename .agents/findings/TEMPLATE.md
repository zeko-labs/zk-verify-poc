# zkVerify PoC Findings Template

## Environment Snapshot
- Date:
- Machine:
- Node:
- pnpm:
- Rust:
- OpenSSL:
- o1js version:
- TLSNotary crate versions:

## End-to-End Result
- Pipeline status: PASS / FAIL
- Total duration:
- Final result: ELIGIBLE / NOT_ELIGIBLE / BLOCKED

## Known Unknowns Resolution Matrix

### 1) TLSNotary secp256k1 API availability
- Evidence:
- Result:
- Impact:

### 2) TLSNotary <-> o1js signature format compatibility
- Evidence:
- Result:
- Impact:

### 3) Self-signed certificate compatibility
- Evidence:
- Result:
- Impact:

### 4) TLS 1.2 enforcement compatibility
- Evidence:
- Result:
- Impact:

### 5) Zeko testnet + o1js compatibility
- Evidence:
- Result:
- Impact:

### 6) Combined circuit performance
- Compile time:
- Prove time:
- Total stage time:
- Impact:

### 7) Session header serialization certainty
- Signed bytes source:
- Encoding details:
- Hashing details:
- Confidence:

## Pass/Fail Criteria
- [ ] Criterion 1: TLSNotary secp256k1 attestation generated
- [ ] Criterion 2: In-circuit secp256k1 verification succeeds
- [ ] Criterion 3: Eligibility logic proof generation succeeds
- [ ] Criterion 4: Local proof verification returns true
- [ ] Criterion 5: Settlement transaction confirms on Zeko
- [ ] Criterion 6: End-to-end runtime under target threshold

## Workarounds Needed
- Item:
- Why:
- Cost:

## Blockers
- Blocker:
- Reproduction:
- Recommended next step:

## Recommended Version Pins
- o1js:
- tlsn-prover:
- tlsn-core:
- tlsn-verifier:
