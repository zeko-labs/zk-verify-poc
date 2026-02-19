import { Bytes, Crypto, Field, Hash, createEcdsa, createForeignCurve } from "o1js";

import { tenureMonthsFromUnixMs } from "./eligibility.js";
import {
  CURRENT_DATE_UNIX_MS,
  MIN_SALARY,
  MIN_TENURE_MONTHS,
  REQUIRED_EMPLOYMENT_STATUS,
  SESSION_HEADER_LENGTH_BYTES,
  TRUSTED_NOTARY_PUBLIC_KEY_X_HEX,
  TRUSTED_NOTARY_PUBLIC_KEY_Y_HEX,
} from "./poc-security-config.js";
import { commitmentHash, hashUtf8StringPoseidon } from "./poseidon.js";

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

function assertTrustedNotaryPublicKey(disclosed: DisclosedFieldsProofInput): void {
  if (
    disclosed.notary_public_key.x !== TRUSTED_NOTARY_PUBLIC_KEY_X_HEX ||
    disclosed.notary_public_key.y !== TRUSTED_NOTARY_PUBLIC_KEY_Y_HEX
  ) {
    throw new Error("notary public key does not match trusted key");
  }
}

function assertSessionHeaderLength(disclosed: DisclosedFieldsProofInput): void {
  const sessionHeaderLengthBytes = disclosed.session_header_bytes.length / 2;
  if (sessionHeaderLengthBytes !== SESSION_HEADER_LENGTH_BYTES) {
    throw new Error(
      `session header length ${sessionHeaderLengthBytes} does not match required length ${SESSION_HEADER_LENGTH_BYTES}`,
    );
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

  assertSessionHeaderLength(normalized);
  assertTrustedNotaryPublicKey(normalized);
  verifySignature(normalized);

  return normalized;
}

export function assertEligibilityPolicy(disclosed: DisclosedFieldsProofInput): void {
  const requiredStatusHash = hashUtf8StringPoseidon(REQUIRED_EMPLOYMENT_STATUS).toString();
  if (disclosed.salary < MIN_SALARY) {
    throw new Error(`salary ${disclosed.salary} is below required minimum ${MIN_SALARY}`);
  }

  const tenureMonths = tenureMonthsFromUnixMs(disclosed.hire_date_unix, CURRENT_DATE_UNIX_MS);
  if (tenureMonths < MIN_TENURE_MONTHS) {
    throw new Error(`tenure ${tenureMonths} months is below required minimum ${MIN_TENURE_MONTHS}`);
  }

  if (disclosed.status_hash !== requiredStatusHash) {
    throw new Error("status hash mismatch with required employment status");
  }
}
