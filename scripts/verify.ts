import { verify } from 'o1js';

import { readJsonFile } from './lib/io.js';

const PROOF_PATH = 'output/proof.json';
const VK_PATH = 'output/verification-key.json';

interface StoredProof {
  proof: {
    publicInput: string[];
    publicOutput: string[];
    maxProofsVerified: 0 | 1 | 2;
    proof: string;
  };
}

interface StoredVerificationKey {
  data: string;
}

async function main(): Promise<void> {
  const storedProof = await readJsonFile<StoredProof>(PROOF_PATH);
  const verificationKey = await readJsonFile<StoredVerificationKey>(VK_PATH);

  const isValid = await verify(storedProof.proof, verificationKey.data);
  console.log(`[verify] Proof valid: ${isValid}`);

  if (!isValid) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error('[verify] failed:', error);
  process.exit(1);
});
