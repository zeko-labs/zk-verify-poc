import { Field, UInt64 } from "o1js";

import { EcdsaSignature, EligibilityProgram, SessionHeaderBytes } from "./circuits/eligibility.js";
import {
  assertEligibilityPolicy,
  hexToBigInt,
  type DisclosedFieldsProofInput,
  validateProofInputIntegrity,
} from "./lib/prove-input.js";
import {
  CURRENT_DATE_UNIX_MS,
  MIN_SALARY,
  MIN_TENURE_MONTHS,
  SESSION_HEADER_LENGTH_BYTES,
} from "./lib/poc-security-config.js";
import { readJsonFile, writeJsonFile } from "./lib/io.js";
import { outputDir } from "./lib/paths.js";

const DISCLOSED_PATH = `${outputDir()}/disclosed-fields.json`;
const PROOF_PATH = `${outputDir()}/proof.json`;
const VK_PATH = `${outputDir()}/verification-key.json`;

async function main(): Promise<void> {
  const disclosedRaw = await readJsonFile<DisclosedFieldsProofInput>(DISCLOSED_PATH);
  const disclosed = validateProofInputIntegrity(disclosedRaw);
  assertEligibilityPolicy(disclosed);

  console.log("[prove] Compiling circuit...");
  const { verificationKey } = await EligibilityProgram.compile();

  const signature = new EcdsaSignature({
    r: hexToBigInt(disclosed.ecdsa_signature.r),
    s: hexToBigInt(disclosed.ecdsa_signature.s),
  });

  const headerLength = disclosed.session_header_bytes.length / 2;
  if (headerLength !== SESSION_HEADER_LENGTH_BYTES) {
    throw new Error(
      `session header length ${headerLength} does not match required length ${SESSION_HEADER_LENGTH_BYTES}`,
    );
  }

  const { proof } = await EligibilityProgram.verifyEligibility(
    Field(disclosed.data_commitment),
    UInt64.from(disclosed.salary),
    UInt64.from(disclosed.hire_date_unix),
    Field(disclosed.status_hash),
    signature,
    SessionHeaderBytes.fromHex(disclosed.session_header_bytes),
  );

  await writeJsonFile(PROOF_PATH, {
    session_header_length_bytes: SESSION_HEADER_LENGTH_BYTES,
    min_salary: MIN_SALARY,
    min_tenure_months: MIN_TENURE_MONTHS,
    current_date_unix_ms: CURRENT_DATE_UNIX_MS,
    proof: proof.toJSON(),
  });

  await writeJsonFile(VK_PATH, {
    data: verificationKey.data,
    hash: verificationKey.hash.toString(),
    session_header_length_bytes: SESSION_HEADER_LENGTH_BYTES,
  });

  console.log(`[prove] Saved ${PROOF_PATH}`);
  console.log(`[prove] Saved ${VK_PATH}`);
}

main().catch((error: unknown) => {
  console.error("[prove] failed:", error);
  process.exit(1);
});
