import { Field } from "o1js";

import { type AttestationJson, parseAttestationJson } from "./attestation.js";
import { commitmentHash, hashUtf8StringPoseidon } from "./poseidon.js";

export interface DisclosedFields {
  salary: number;
  hire_date_unix: number;
  status_hash: string;
  response_body_hash: string;
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

interface EmployeePayload {
  annual_salary: number;
  hire_date: string;
  employment_status: string;
}

function parseEmployeePayload(responseBody: string): EmployeePayload {
  const parsed = JSON.parse(responseBody) as Partial<EmployeePayload>;

  if (typeof parsed.annual_salary !== "number") {
    throw new Error("response_body.annual_salary must be a number");
  }
  if (typeof parsed.hire_date !== "string") {
    throw new Error("response_body.hire_date must be a string");
  }
  if (typeof parsed.employment_status !== "string") {
    throw new Error("response_body.employment_status must be a string");
  }

  return {
    annual_salary: parsed.annual_salary,
    hire_date: parsed.hire_date,
    employment_status: parsed.employment_status,
  };
}

function toUnixMsUtc(dateIso: string): number {
  const ts = Date.parse(`${dateIso}T00:00:00.000Z`);
  if (Number.isNaN(ts)) {
    throw new Error(`invalid hire_date: ${dateIso}`);
  }

  return ts;
}

export function buildDisclosedFields(attestationInput: unknown): DisclosedFields {
  const attestation: AttestationJson = parseAttestationJson(attestationInput);
  const employee = parseEmployeePayload(attestation.response_body);

  const hireDateUnix = toUnixMsUtc(employee.hire_date);
  const statusHash = hashUtf8StringPoseidon(employee.employment_status);
  const responseBodyHash = hashUtf8StringPoseidon(attestation.response_body);
  const dataCommitment = commitmentHash(
    employee.annual_salary,
    hireDateUnix,
    statusHash,
    responseBodyHash,
  );

  return {
    salary: employee.annual_salary,
    hire_date_unix: hireDateUnix,
    status_hash: statusHash.toString(),
    response_body_hash: responseBodyHash.toString(),
    data_commitment: dataCommitment.toString(),
    ecdsa_signature: {
      r: attestation.signature.r_hex,
      s: attestation.signature.s_hex,
    },
    session_header_bytes: attestation.session_header_bytes_hex,
    notary_public_key: {
      x: attestation.notary_public_key.x_hex,
      y: attestation.notary_public_key.y_hex,
    },
  };
}

export function statusHashToField(value: string): Field {
  return Field(value);
}
