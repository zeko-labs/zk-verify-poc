import { Field, Mina, Poseidon, PrivateKey, PublicKey, fetchAccount } from 'o1js';

import { VerificationRegistry } from '../contracts/VerificationRegistry.js';
import { loadRuntimeEnv } from './lib/env.js';
import { readJsonFile } from './lib/io.js';

const PROOF_PATH = 'output/proof.json';
const DEPLOYED_PATH = 'output/deployed-address.json';
const TX_FEE = 100_000_000;

interface StoredProof {
  proof: {
    publicOutput: string[];
  };
}

interface DeployedAddress {
  zkapp_public_key: string;
}

function proofHashFromJson(proofJson: unknown): Field {
  const bytes = Buffer.from(JSON.stringify(proofJson), 'utf8');
  const fields = [...bytes].map((value) => Field(value));
  return Poseidon.hash(fields);
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

  const deployed = await readJsonFile<DeployedAddress>(DEPLOYED_PATH);
  const storedProof = await readJsonFile<StoredProof>(PROOF_PATH);

  const registry = new VerificationRegistry(PublicKey.fromBase58(deployed.zkapp_public_key));
  const proofHash = proofHashFromJson(storedProof.proof);
  const result = storedProof.proof.publicOutput[0] === '1' ? Field(1) : Field(0);

  const tx = await Mina.transaction({ sender: feePayerPublicKey, fee: TX_FEE }, async () => {
    await registry.recordVerification(proofHash, result);
  });

  console.log('[settle] Proving settlement transaction...');
  await tx.prove();

  const pendingTx = await tx.sign([feePayerKey]).send();

  console.log(`[settle] Transaction hash: ${pendingTx.hash}`);
  console.log(`[settle] Explorer: https://zekoscan.io/testnet/tx/${pendingTx.hash}`);

  if (pendingTx.status === 'pending') {
    await pendingTx.wait();
  }
}

main().catch((error: unknown) => {
  console.error('[settle] failed:', error);
  process.exit(1);
});
