import { Field, UInt64 } from "o1js";

import { createEligibilityProgram } from "./circuits/eligibility.js";
import {
  assertEligibilityPolicy,
  hexToBigInt,
  type DisclosedFieldsProofInput,
  validateProofInputIntegrity,
} from "./lib/prove-input.js";
import { hashUtf8StringPoseidon } from "./lib/poseidon.js";
import { readJsonFile, writeJsonFile } from "./lib/io.js";
import { outputDir } from "./lib/paths.js";

const DISCLOSED_PATH = `${outputDir()}/disclosed-fields.json`;
const PROOF_PATH = `${outputDir()}/proof.json`;
const VK_PATH = `${outputDir()}/verification-key.json`;

const MIN_SALARY = 50_000;
const MIN_TENURE_MONTHS = 12;
const CURRENT_DATE_UNIX_MS = Date.UTC(2026, 1, 18);

async function main(): Promise<void> {
  const disclosedRaw = await readJsonFile<DisclosedFieldsProofInput>(DISCLOSED_PATH);
  const disclosed = validateProofInputIntegrity(disclosedRaw);
  const requiredStatusHash = hashUtf8StringPoseidon("active");

  assertEligibilityPolicy(disclosed, {
    minSalary: MIN_SALARY,
    minTenureMonths: MIN_TENURE_MONTHS,
    currentDateUnixMs: CURRENT_DATE_UNIX_MS,
    requiredStatusHash: requiredStatusHash.toString(),
  });

  const headerLength = disclosed.session_header_bytes.length / 2;
  const { Program, SignatureType, PublicKeyType, SessionHeaderType } =
    createEligibilityProgram(headerLength);

  console.log("[prove] Compiling circuit...");
  const { verificationKey } = await Program.compile();

  const signature = new SignatureType({
    r: hexToBigInt(disclosed.ecdsa_signature.r),
    s: hexToBigInt(disclosed.ecdsa_signature.s),
  });

  const publicKey = new PublicKeyType({
    x: hexToBigInt(disclosed.notary_public_key.x),
    y: hexToBigInt(disclosed.notary_public_key.y),
  });

  const { proof } = await Program.verifyEligibility(
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

  console.log("[prove] Saved output/proof.json");
  console.log("[prove] Saved output/verification-key.json");
}

main().catch((error: unknown) => {
  console.error("[prove] failed:", error);
  process.exit(1);
});
