import { AccountUpdate, Mina, PrivateKey, PublicKey, fetchAccount } from "o1js";

import { EligibilityProgram } from "./circuits/eligibility.js";
import { VerificationRegistry } from "./contracts/VerificationRegistry.js";
import { writeDeployedAddressMetadata } from "./lib/deploy-metadata.js";
import { loadRuntimeEnv } from "./lib/env.js";

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

  console.log("[deploy] Compiling EligibilityProgram...");
  await EligibilityProgram.compile();
  console.log("[deploy] Compiling VerificationRegistry contract...");
  const { verificationKey } = await VerificationRegistry.compile();

  const zkAppAccount = await fetchAccount({ publicKey: zkAppPublicKey });
  const hasExistingAccount = !zkAppAccount.error && Boolean(zkAppAccount.account);
  const onChainVerificationKeyHash = zkAppAccount.account?.zkapp?.verificationKey?.hash?.toString();
  const targetVerificationKeyHash = verificationKey.hash.toString();

  if (hasExistingAccount && onChainVerificationKeyHash === targetVerificationKeyHash) {
    console.log(
      "[deploy] Existing zkApp account detected with matching verification key. Skipping redeploy.",
    );
    await writeDeployedAddressMetadata({
      zkappPublicKey: zkAppPublicKey.toBase58(),
      zkappPrivateKeyGenerated: env.zkappPrivateKey ? false : true,
      deployTxHash: "already-deployed",
      alreadyDeployed: true,
    });
    console.log("[deploy] Saved output/deployed-address.json");
    return;
  }

  if (hasExistingAccount) {
    console.log("[deploy] Existing zkApp account detected with mismatched verification key.");
    console.log(
      `[deploy] On-chain verification key hash: ${onChainVerificationKeyHash ?? "missing"}`,
    );
    console.log(`[deploy] Target verification key hash: ${targetVerificationKeyHash}`);
  }

  const zkApp = new VerificationRegistry(zkAppPublicKey);

  const tx = await Mina.transaction(
    { sender: feePayerPublicKey, fee: TX_FEE, nonce: feePayerNonceBefore },
    async () => {
      if (!hasExistingAccount) {
        AccountUpdate.fundNewAccount(feePayerPublicKey);
      }
      await zkApp.deploy({ verificationKey });
    },
  );

  console.log("[deploy] Proving deployment transaction...");
  await tx.prove();

  const pendingTx = await tx.sign([feePayerKey, zkAppPrivateKey]).send();

  console.log(`[deploy] Submitted deploy tx hash: ${pendingTx.hash}`);
  const feePayerNonceAfter = await waitForNonceIncrement(feePayerPublicKey, feePayerNonceBefore);
  console.log(`[deploy] Fee payer nonce advanced ${feePayerNonceBefore} -> ${feePayerNonceAfter}`);

  await writeDeployedAddressMetadata({
    zkappPublicKey: zkAppPublicKey.toBase58(),
    zkappPrivateKeyGenerated: env.zkappPrivateKey ? false : true,
    deployTxHash: pendingTx.hash,
    alreadyDeployed: hasExistingAccount,
    verificationKeyHash: targetVerificationKeyHash,
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
