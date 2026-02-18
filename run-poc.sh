#!/bin/bash
set -eEuo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

RUN_ID="$(date +%Y-%m-%dT%H-%M-%S)"
export OUTPUT_DIR="$(pwd)/output/${RUN_ID}"
mkdir -p "$OUTPUT_DIR"

MOCK_SERVER_STARTUP_DELAY_SEC="${RUN_POC_MOCK_STARTUP_DELAY_SEC:-2}"
NOTARY_STARTUP_DELAY_SEC="${RUN_POC_NOTARY_STARTUP_DELAY_SEC:-3}"
CURRENT_STEP="bootstrap"

cleanup() {
  local exit_code=$?

  if [ -n "${MOCK_PID:-}" ] && kill -0 "$MOCK_PID" 2>/dev/null; then
    kill "$MOCK_PID" 2>/dev/null || true
    wait "$MOCK_PID" 2>/dev/null || true
  fi

  if [ -n "${NOTARY_PID:-}" ] && kill -0 "$NOTARY_PID" 2>/dev/null; then
    kill "$NOTARY_PID" 2>/dev/null || true
    wait "$NOTARY_PID" 2>/dev/null || true
  fi

  echo "[run-poc] cleanup complete"
  return "$exit_code"
}

on_error() {
  local exit_code=$1
  echo "[run-poc] failed at step: ${CURRENT_STEP}" >&2
  return "$exit_code"
}

trap cleanup EXIT
trap 'on_error $?' ERR

echo ""
echo "========================================="
echo "  zkVerify PoC - End-to-End Pipeline"
echo "  Output: ${OUTPUT_DIR}"
echo "========================================="
echo ""

echo "[1/7] Starting mock employer HTTPS server (TLS 1.2)..."
CURRENT_STEP="mock-server:serve"
moon run mock-server:serve &
MOCK_PID=$!
sleep "$MOCK_SERVER_STARTUP_DELAY_SEC"
echo "       -> Listening on https://localhost:4443"
echo ""

echo "[2/7] Running TLSNotary attestation..."
CURRENT_STEP="tlsnotary:notary"
moon run tlsnotary:notary &
NOTARY_PID=$!
sleep "$NOTARY_STARTUP_DELAY_SEC"
CURRENT_STEP="tlsnotary:prover"
moon run tlsnotary:prover
echo "       -> Saved: ${OUTPUT_DIR}/attestation.json"
echo ""

echo "[3/7] Extracting attested fields..."
CURRENT_STEP="poc:extract"
moon run poc:extract
echo "       -> Saved: ${OUTPUT_DIR}/disclosed-fields.json"
echo ""

echo "[4/7] Generating ZK proof (o1js)..."
echo "       -> Compiling circuit... (this takes ~60-120s)"
CURRENT_STEP="poc:prove"
moon run poc:prove
echo "       -> Saved: ${OUTPUT_DIR}/proof.json, ${OUTPUT_DIR}/verification-key.json"
echo ""

echo "[5/7] Verifying proof locally..."
CURRENT_STEP="poc:verify"
moon run poc:verify
echo ""

echo "[6/7] Posting proof to Zeko testnet..."
CURRENT_STEP="poc:settle"
moon run poc:settle
echo ""

echo "[7/7] Verifying on-chain state via GraphQL node..."
CURRENT_STEP="poc:verify-chain"
moon run poc:verify-chain
echo ""

echo "✅ End-to-end pipeline complete."
