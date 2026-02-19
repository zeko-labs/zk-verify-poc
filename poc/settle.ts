import { Field, Mina, Poseidon, PrivateKey, PublicKey, fetchAccount } from "o1js";

import { EligibilityProgram, EligibilityProof } from "./circuits/eligibility.js";
import { VerificationRegistry } from "./contracts/VerificationRegistry.js";
import { loadRuntimeEnv } from "./lib/env.js";
import { readJsonFile } from "./lib/io.js";
import { outputDir } from "./lib/paths.js";

const PROOF_PATH = `${outputDir()}/proof.json`;
const TX_FEE = 100_000_000;
const POLL_DELAY_MS = 3_000;
const MAX_NONCE_POLL_ATTEMPTS = 30;

interface StoredProof {
  proof: {
    publicInput: string[];
    publicOutput: string[];
    maxProofsVerified: 0 | 1 | 2;
    proof: string;
  };
}

function proofHashFromJson(proofJson: unknown): Field {
  const bytes = Buffer.from(JSON.stringify(proofJson), "utf8");
  const fields = [...bytes].map((value) => Field(value));
  return Poseidon.hash(fields);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readAccountNonce(publicKey: PublicKey): Promise<number> {
  const account = await fetchAccount({ publicKey });
  if (account.error || !account.account) {
    throw new Error(
      `account fetch failed while polling nonce: ${account.error?.statusText ?? "unknown"}`,
    );
  }

  return Number(account.account.nonce.toString());
}

async function waitForNonceIncrement(publicKey: PublicKey, baselineNonce: number): Promise<number> {
  for (let attempt = 1; attempt <= MAX_NONCE_POLL_ATTEMPTS; attempt += 1) {
    const nonce = await readAccountNonce(publicKey);
    if (nonce > baselineNonce) {
      return nonce;
    }

    await sleep(POLL_DELAY_MS);
  }

  throw new Error(
    `transaction was submitted but account nonce did not increment above ${baselineNonce} within polling window`,
  );
}

async function main(): Promise<void> {
  const env = loadRuntimeEnv();
  const network = Mina.Network(env.zekoGraphqlUrl);
  Mina.setActiveInstance(network);

  const feePayerKey = PrivateKey.fromBase58(env.feePayerPrivateKey);
  const feePayerPublicKey = feePayerKey.toPublicKey();

  const feePayerAccount = await fetchAccount({ publicKey: feePayerPublicKey });
  if (feePayerAccount.error) {
    throw new Error(`fee payer account fetch failed: ${feePayerAccount.error.statusText}`);
  }
  const feePayerNonceBefore = Number(feePayerAccount.account?.nonce.toString() ?? "0");

  const zkAppAddress = env.zkappPublicKey;
  if (!zkAppAddress) {
    throw new Error("missing required env var: ZKAPP_PUBLIC_KEY (set in .env or deploy first)");
  }

  const storedProof = await readJsonFile<StoredProof>(PROOF_PATH);
  const eligibilityProof = await EligibilityProof.fromJSON(storedProof.proof);

  console.log("[settle] Compiling EligibilityProgram...");
  await EligibilityProgram.compile();
  console.log("[settle] Compiling VerificationRegistry contract...");
  await VerificationRegistry.compile();

  const registry = new VerificationRegistry(PublicKey.fromBase58(zkAppAddress));
  const proofHash = proofHashFromJson(storedProof.proof);

  const tx = await Mina.transaction(
    { sender: feePayerPublicKey, fee: TX_FEE, nonce: feePayerNonceBefore },
    async () => {
      await registry.recordVerification(proofHash, eligibilityProof);
    },
  );

  console.log("[settle] Proving settlement transaction...");
  await tx.prove();

  const pendingTx = await tx.sign([feePayerKey]).send();

  console.log(`[settle] Transaction hash: ${pendingTx.hash}`);
  console.log(`[settle] Explorer: https://zekoscan.io/testnet/tx/${pendingTx.hash}`);

  const feePayerNonceAfter = await waitForNonceIncrement(feePayerPublicKey, feePayerNonceBefore);
  console.log(`[settle] Fee payer nonce advanced ${feePayerNonceBefore} -> ${feePayerNonceAfter}`);
}

main().catch((error: unknown) => {
  console.error("[settle] failed:", error);
  process.exit(1);
});
