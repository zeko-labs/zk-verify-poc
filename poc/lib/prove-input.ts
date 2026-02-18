import { Bytes, Crypto, Field, Hash, createEcdsa, createForeignCurve } from "o1js";

import { tenureMonthsFromUnixMs } from "./eligibility.js";
import { commitmentHash } from "./poseidon.js";

export interface DisclosedFieldsProofInput {
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

export interface EligibilityPolicy {
  minSalary: number;
  minTenureMonths: number;
  currentDateUnixMs: number;
  requiredStatusHash: string;
}

class Secp256k1 extends createForeignCurve(Crypto.CurveParams.Secp256k1) {}
class EcdsaSignature extends createEcdsa(Secp256k1) {}

function requireSafeInteger(value: number, fieldName: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${fieldName} must be a safe integer`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} must be non-negative`);
  }

  return value;
}

function requireFieldString(value: string, fieldName: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty string`);
  }
  if (!/^-?\d+$/.test(value)) {
    throw new Error(`${fieldName} must be a base-10 integer string`);
  }

  return value;
}

function normalizeHex(value: unknown, fieldName: string, expectedBytes?: number): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${fieldName} must be a non-empty hex string`);
  }

  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (
    normalized.length === 0 ||
    normalized.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(normalized)
  ) {
    throw new Error(`${fieldName} must be valid hex`);
  }
  if (expectedBytes !== undefined && normalized.length !== expectedBytes * 2) {
    throw new Error(`${fieldName} must be ${expectedBytes} bytes`);
  }

  return normalized.toLowerCase();
}

export function hexToBigInt(value: string): bigint {
  return BigInt(`0x${normalizeHex(value, "hex value")}`);
}

function verifySignature(disclosed: DisclosedFieldsProofInput): void {
  const sessionHeaderLengthBytes = disclosed.session_header_bytes.length / 2;
  const SessionHeaderType = Bytes(sessionHeaderLengthBytes);
  const signedMessageHash = Hash.SHA2_256.hash(
    SessionHeaderType.fromHex(disclosed.session_header_bytes),
  );

  const signature = new EcdsaSignature({
    r: hexToBigInt(disclosed.ecdsa_signature.r),
    s: hexToBigInt(disclosed.ecdsa_signature.s),
  });

  const publicKey = new Secp256k1({
    x: hexToBigInt(disclosed.notary_public_key.x),
    y: hexToBigInt(disclosed.notary_public_key.y),
  });

  if (!signature.verifySignedHash(signedMessageHash, publicKey).toBoolean()) {
    throw new Error("ECDSA signature does not match session header bytes");
  }
}

export function validateProofInputIntegrity(
  input: DisclosedFieldsProofInput,
): DisclosedFieldsProofInput {
  const normalized: DisclosedFieldsProofInput = {
    salary: requireSafeInteger(input.salary, "salary"),
    hire_date_unix: requireSafeInteger(input.hire_date_unix, "hire_date_unix"),
    status_hash: requireFieldString(input.status_hash, "status_hash"),
    data_commitment: requireFieldString(input.data_commitment, "data_commitment"),
    ecdsa_signature: {
      r: normalizeHex(input.ecdsa_signature?.r, "ecdsa_signature.r", 32),
      s: normalizeHex(input.ecdsa_signature?.s, "ecdsa_signature.s", 32),
    },
    session_header_bytes: normalizeHex(input.session_header_bytes, "session_header_bytes"),
    notary_public_key: {
      x: normalizeHex(input.notary_public_key?.x, "notary_public_key.x", 32),
      y: normalizeHex(input.notary_public_key?.y, "notary_public_key.y", 32),
    },
  };

  const statusHashField = Field(normalized.status_hash);
  const computedDataCommitment = commitmentHash(
    normalized.salary,
    normalized.hire_date_unix,
    statusHashField,
  ).toString();

  if (computedDataCommitment !== normalized.data_commitment) {
    throw new Error("data commitment does not match disclosed salary/hire_date/status values");
  }

  verifySignature(normalized);

  return normalized;
}

export function assertEligibilityPolicy(
  disclosed: DisclosedFieldsProofInput,
  policy: EligibilityPolicy,
): void {
  const minSalary = requireSafeInteger(policy.minSalary, "minSalary");
  const minTenureMonths = requireSafeInteger(policy.minTenureMonths, "minTenureMonths");
  const currentDateUnixMs = requireSafeInteger(policy.currentDateUnixMs, "currentDateUnixMs");
  const requiredStatusHash = requireFieldString(policy.requiredStatusHash, "requiredStatusHash");

  if (disclosed.salary < minSalary) {
    throw new Error(`salary ${disclosed.salary} is below required minimum ${minSalary}`);
  }

  const tenureMonths = tenureMonthsFromUnixMs(disclosed.hire_date_unix, currentDateUnixMs);
  if (tenureMonths < minTenureMonths) {
    throw new Error(`tenure ${tenureMonths} months is below required minimum ${minTenureMonths}`);
  }

  if (disclosed.status_hash !== requiredStatusHash) {
    throw new Error("status hash mismatch with required employment status");
  }
}
