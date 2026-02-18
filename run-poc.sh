#!/bin/bash
set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

cleanup() {
  if [ -n "${MOCK_PID:-}" ]; then
    kill "$MOCK_PID" 2>/dev/null || true
  fi

  if [ -n "${NOTARY_PID:-}" ]; then
    kill "$NOTARY_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT

echo ""
echo "========================================="
echo "  zkVerify PoC - End-to-End Pipeline"
echo "========================================="
echo ""

echo "[1/6] Starting mock employer HTTPS server (TLS 1.2)..."
moon run mock-server:serve &
MOCK_PID=$!
sleep 2
echo "       -> Listening on https://localhost:4443"
echo ""

echo "[2/6] Running TLSNotary attestation..."
moon run tlsnotary:notary &
NOTARY_PID=$!
sleep 3
moon run tlsnotary:prover
echo "       -> Saved: output/attestation.json"
echo ""

echo "[3/6] Extracting attested fields..."
moon run poc:extract
echo "       -> Saved: output/disclosed-fields.json"
echo ""

echo "[4/6] Generating ZK proof (o1js)..."
echo "       -> Compiling circuit... (this takes ~60-120s)"
moon run poc:prove
echo "       -> Saved: output/proof.json, output/verification-key.json"
echo ""

echo "[5/6] Verifying proof locally..."
moon run poc:verify
echo ""

echo "[6/6] Posting proof to Zeko testnet..."
moon run poc:settle
echo ""

echo "✅ End-to-end pipeline complete."
