import { AccountUpdate, Mina, PrivateKey, fetchAccount } from 'o1js';

import { VerificationRegistry } from '../contracts/VerificationRegistry.js';
import { loadRuntimeEnv } from './lib/env.js';
import { writeJsonFile } from './lib/io.js';

const DEPLOYED_PATH = 'output/deployed-address.json';
const TX_FEE = 100_000_000;

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

  console.log('[deploy] Compiling VerificationRegistry contract...');
  const { verificationKey } = await VerificationRegistry.compile();

  const zkApp = new VerificationRegistry(zkAppPublicKey);

  const tx = await Mina.transaction({ sender: feePayerPublicKey, fee: TX_FEE }, async () => {
    AccountUpdate.fundNewAccount(feePayerPublicKey);
    await zkApp.deploy({ verificationKey });
  });

  console.log('[deploy] Proving deployment transaction...');
  await tx.prove();

  const pendingTx = await tx.sign([feePayerKey, zkAppPrivateKey]).send();

  console.log(`[deploy] Submitted deploy tx hash: ${pendingTx.hash}`);
  if (pendingTx.status === 'pending') {
    await pendingTx.wait();
  }

  await writeJsonFile(DEPLOYED_PATH, {
    zkapp_public_key: zkAppPublicKey.toBase58(),
    zkapp_private_key_generated: env.zkappPrivateKey ? false : true,
    deploy_tx_hash: pendingTx.hash,
  });

  console.log('[deploy] Saved output/deployed-address.json');
  if (!env.zkappPrivateKey) {
    console.log('[deploy] WARNING: zkApp private key was generated ephemeral for this run. Persist it in .env for reuse.');
  }
}

main().catch((error: unknown) => {
  console.error('[deploy] failed:', error);
  process.exit(1);
});
