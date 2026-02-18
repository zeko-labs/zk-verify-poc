# zkVerify PoC - Product Requirements Document

Version: 1.0  
Date: February 18, 2026  
Type: Proof of Concept - local CLI pipeline

## Objective
Validate the core cryptographic pipeline for privacy-preserving employment verification on Zeko:
1. TLSNotary attestation from TLS 1.2 session.
2. In-circuit ECDSA/secp256k1 verification in o1js plus eligibility logic.
3. On-chain settlement on Zeko testnet.

## Scope
In scope:
- Local CLI-only workflow.
- Mock HTTPS employer server.
- Rust TLSNotary prover/notary binaries.
- TypeScript scripts for extraction, proving, verification, deployment, settlement.
- Minimal smart contract for recording proof hash and result.

Out of scope:
- UI, hosted APIs, DB, queues, cloud orchestration.
- Production-grade auth/error handling/scalability.

## Pipeline
1. Start mock TLS 1.2 server at `https://localhost:4443`.
2. Run TLSNotary notary and prover to create `output/attestation.json`.
3. Extract disclosed fields and commitment to `output/disclosed-fields.json`.
4. Compile and prove eligibility circuit (with in-circuit ECDSA) -> `output/proof.json` and `output/verification-key.json`.
5. Verify proof locally.
6. Settle proof result on Zeko testnet.

## Core Technical Requirements
- TLSNotary notary attestation must use ECDSA on secp256k1.
- Circuit verifies:
  - Notary ECDSA signature over session header bytes.
  - Poseidon data commitment consistency.
  - Eligibility rules:
    - `salary >= 50000`
    - `tenure >= 12 months`
    - `status == active`
- Settlement target endpoint:
  - `https://testnet.zeko.io/graphql`

## Key Risks to Validate
1. TLSNotary secp256k1 signing API availability and stability.
2. Signature encoding compatibility between TLSNotary output and o1js ECDSA gadget.
3. TLSNotary behavior with localhost/self-signed certificates.
4. TLS 1.2 enforcement and handshake compatibility.
5. o1js compatibility with Zeko testnet deployment/transactions.
6. Proof generation time with in-circuit ECDSA.
7. Exact signed message bytes for session header.

## Fallback Policy for This Repository
This repo is strict full-ECDSA PoC. It fails hard if step 2 cannot produce compatible secp256k1 attestation output. No automatic fallback path is executed.

## Pass Criteria
- Attestation generated with secp256k1 signature material.
- Proof generated with in-circuit ECDSA verification constraint active.
- Proof verifies locally.
- Proof result posted to Zeko testnet.
- End-to-end pipeline runs from one command.
