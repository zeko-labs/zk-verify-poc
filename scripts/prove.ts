import { Field, UInt64 } from 'o1js';

import { createEligibilityProgram } from '../circuits/eligibility.js';
import { hashUtf8StringPoseidon } from './lib/poseidon.js';
import { readJsonFile, writeJsonFile } from './lib/io.js';

const DISCLOSED_PATH = 'output/disclosed-fields.json';
const PROOF_PATH = 'output/proof.json';
const VK_PATH = 'output/verification-key.json';

const MIN_SALARY = 50_000;
const MIN_TENURE_MONTHS = 12;
const CURRENT_DATE_UNIX_MS = Date.UTC(2026, 1, 18);

interface DisclosedFieldsFile {
  salary: number;
  hire_date_unix: number;
  status_hash: string;
  data_commitment: string;
  ecdsa_signature: {
    r: string;
    s: string;
  };
  session_header_bytes: string;
  notary_public_key: {
    x: string;
    y: string;
  };
}

function toBigIntHex(hexValue: string): bigint {
  const normalized = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
  return BigInt(`0x${normalized}`);
}

async function main(): Promise<void> {
  const disclosed = await readJsonFile<DisclosedFieldsFile>(DISCLOSED_PATH);

  const headerLength = disclosed.session_header_bytes.length / 2;
  const { Program, SignatureType, PublicKeyType, SessionHeaderType } = createEligibilityProgram(
    headerLength,
  );

  console.log('[prove] Compiling circuit...');
  const { verificationKey } = await Program.compile();

  const signature = new SignatureType({
    r: toBigIntHex(disclosed.ecdsa_signature.r),
    s: toBigIntHex(disclosed.ecdsa_signature.s),
  });

  const publicKey = new PublicKeyType({
    x: toBigIntHex(disclosed.notary_public_key.x),
    y: toBigIntHex(disclosed.notary_public_key.y),
  });

  const requiredStatusHash = hashUtf8StringPoseidon('active');

  const proof = await Program.verifyEligibility(
    Field(disclosed.data_commitment),
    UInt64.from(disclosed.salary),
    UInt64.from(disclosed.hire_date_unix),
    Field(disclosed.status_hash),
    signature,
    publicKey,
    SessionHeaderType.fromHex(disclosed.session_header_bytes),
    UInt64.from(MIN_SALARY),
    UInt64.from(MIN_TENURE_MONTHS),
    UInt64.from(CURRENT_DATE_UNIX_MS),
    requiredStatusHash,
  );

  await writeJsonFile(PROOF_PATH, {
    session_header_length_bytes: headerLength,
    min_salary: MIN_SALARY,
    min_tenure_months: MIN_TENURE_MONTHS,
    current_date_unix_ms: CURRENT_DATE_UNIX_MS,
    proof: proof.toJSON(),
  });

  await writeJsonFile(VK_PATH, {
    data: verificationKey.data,
    hash: verificationKey.hash.toString(),
    session_header_length_bytes: headerLength,
  });

  console.log('[prove] Saved output/proof.json');
  console.log('[prove] Saved output/verification-key.json');
}

main().catch((error: unknown) => {
  console.error('[prove] failed:', error);
  process.exit(1);
});
