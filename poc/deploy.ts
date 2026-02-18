import { AccountUpdate, Mina, PrivateKey, PublicKey, fetchAccount } from "o1js";

import { VerificationRegistry } from "./contracts/VerificationRegistry.js";
import { loadRuntimeEnv } from "./lib/env.js";
import { writeJsonFile } from "./lib/io.js";

const DEPLOYED_PATH = "output/deployed-address.json";
const TX_FEE = 100_000_000;
const POLL_DELAY_MS = 3_000;
const MAX_NONCE_POLL_ATTEMPTS = 30;

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

  const zkAppPrivateKey = env.zkappPrivateKey
    ? PrivateKey.fromBase58(env.zkappPrivateKey)
    : PrivateKey.random();
  const zkAppPublicKey = zkAppPrivateKey.toPublicKey();

  const feePayerAccount = await fetchAccount({ publicKey: feePayerPublicKey });
  if (feePayerAccount.error) {
    throw new Error(`fee payer account fetch failed: ${feePayerAccount.error.statusText}`);
  }
  const feePayerNonceBefore = Number(feePayerAccount.account?.nonce.toString() ?? "0");

  const zkAppAccount = await fetchAccount({ publicKey: zkAppPublicKey });
  if (!zkAppAccount.error && zkAppAccount.account) {
    console.log(
      "[deploy] Existing zkApp account detected. Skipping redeploy and writing output metadata.",
    );
    await writeJsonFile(DEPLOYED_PATH, {
      zkapp_public_key: zkAppPublicKey.toBase58(),
      zkapp_private_key_generated: env.zkappPrivateKey ? false : true,
      deploy_tx_hash: "already-deployed",
      already_deployed: true,
    });
    console.log("[deploy] Saved output/deployed-address.json");
    return;
  }

  console.log("[deploy] Compiling VerificationRegistry contract...");
  const { verificationKey } = await VerificationRegistry.compile();

  const zkApp = new VerificationRegistry(zkAppPublicKey);

  const tx = await Mina.transaction(
    { sender: feePayerPublicKey, fee: TX_FEE, nonce: feePayerNonceBefore },
    async () => {
      AccountUpdate.fundNewAccount(feePayerPublicKey);
      await zkApp.deploy({ verificationKey });
    },
  );

  console.log("[deploy] Proving deployment transaction...");
  await tx.prove();

  const pendingTx = await tx.sign([feePayerKey, zkAppPrivateKey]).send();

  console.log(`[deploy] Submitted deploy tx hash: ${pendingTx.hash}`);
  const feePayerNonceAfter = await waitForNonceIncrement(feePayerPublicKey, feePayerNonceBefore);
  console.log(`[deploy] Fee payer nonce advanced ${feePayerNonceBefore} -> ${feePayerNonceAfter}`);

  await writeJsonFile(DEPLOYED_PATH, {
    zkapp_public_key: zkAppPublicKey.toBase58(),
    zkapp_private_key_generated: env.zkappPrivateKey ? false : true,
    deploy_tx_hash: pendingTx.hash,
  });

  console.log("[deploy] Saved output/deployed-address.json");
  if (!env.zkappPrivateKey) {
    console.log(
      "[deploy] WARNING: zkApp private key was generated ephemeral for this run. Persist it in .env for reuse.",
    );
  }
}

main().catch((error: unknown) => {
  console.error("[deploy] failed:", error);
  process.exit(1);
});
