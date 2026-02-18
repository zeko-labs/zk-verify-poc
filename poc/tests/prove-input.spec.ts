import { createSign, generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { assertEligibilityPolicy, validateProofInputIntegrity } from "../lib/prove-input.js";
import { commitmentHash, hashUtf8StringPoseidon } from "../lib/poseidon.js";

interface DisclosedFieldsFixture {
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

function base64urlToHex(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("hex");
}

function readDerLength(buffer: Buffer, offset: number): { length: number; nextOffset: number } {
  const first = buffer[offset];
  if (first < 0x80) {
    return { length: first, nextOffset: offset + 1 };
  }

  const octets = first & 0x7f;
  let value = 0;
  for (let i = 0; i < octets; i += 1) {
    value = (value << 8) | buffer[offset + 1 + i];
  }

  return { length: value, nextOffset: offset + 1 + octets };
}

function decodeCompactSignatureFromDer(der: Buffer): { rHex: string; sHex: string } {
  let offset = 0;
  if (der[offset] !== 0x30) {
    throw new Error("invalid DER sequence tag");
  }
  offset += 1;
  const seqLength = readDerLength(der, offset);
  offset = seqLength.nextOffset;

  const end = offset + seqLength.length;
  if (der[offset] !== 0x02) {
    throw new Error("invalid DER integer tag for r");
  }
  offset += 1;
  const rLength = readDerLength(der, offset);
  offset = rLength.nextOffset;
  let r = der.subarray(offset, offset + rLength.length);
  offset += rLength.length;

  if (der[offset] !== 0x02) {
    throw new Error("invalid DER integer tag for s");
  }
  offset += 1;
  const sLength = readDerLength(der, offset);
  offset = sLength.nextOffset;
  let s = der.subarray(offset, offset + sLength.length);
  offset += sLength.length;

  if (offset !== end) {
    throw new Error("invalid DER structure length");
  }

  while (r.length > 32 && r[0] === 0) {
    r = r.subarray(1);
  }
  while (s.length > 32 && s[0] === 0) {
    s = s.subarray(1);
  }
  if (r.length > 32 || s.length > 32) {
    throw new Error("DER integer exceeds 32 bytes for secp256k1");
  }

  return {
    rHex: r.toString("hex").padStart(64, "0"),
    sHex: s.toString("hex").padStart(64, "0"),
  };
}

function buildFixture(): DisclosedFieldsFixture {
  const salary = 85_000;
  const hireDateUnix = Date.UTC(2023, 5, 15);
  const statusHash = hashUtf8StringPoseidon("active");
  const dataCommitment = commitmentHash(salary, hireDateUnix, statusHash);
  const sessionHeader = Buffer.from("zkverify-session-header", "utf8");

  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "secp256k1",
  });

  const signer = createSign("sha256");
  signer.update(sessionHeader);
  signer.end();
  const signatureDer = signer.sign(privateKey);
  const { rHex, sHex } = decodeCompactSignatureFromDer(signatureDer);

  const jwk = publicKey.export({ format: "jwk" });
  if (!jwk.x || !jwk.y) {
    throw new Error("expected x/y coordinates in secp256k1 JWK export");
  }

  return {
    salary,
    hire_date_unix: hireDateUnix,
    status_hash: statusHash.toString(),
    data_commitment: dataCommitment.toString(),
    ecdsa_signature: {
      r: rHex,
      s: sHex,
    },
    session_header_bytes: sessionHeader.toString("hex"),
    notary_public_key: {
      x: base64urlToHex(jwk.x),
      y: base64urlToHex(jwk.y),
    },
  };
}

describe("prove input integrity", () => {
  it("Given valid disclosed fields When integrity is validated Then proving preflight passes", () => {
    const fixture = buildFixture();
    expect(() => validateProofInputIntegrity(fixture)).not.toThrow();
  });

  it("Given a tampered session header When integrity is validated Then ECDSA mismatch fails fast", () => {
    const fixture = buildFixture();
    const tampered = {
      ...fixture,
      session_header_bytes: fixture.session_header_bytes.slice(0, -2) + "00",
    };

    expect(() => validateProofInputIntegrity(tampered)).toThrow(
      /ecdsa signature does not match session header bytes/i,
    );
  });

  it("Given salary below required threshold When eligibility policy is validated Then it fails with salary diagnostics", () => {
    const fixture = buildFixture();
    const requiredStatusHash = hashUtf8StringPoseidon("active").toString();

    expect(() =>
      assertEligibilityPolicy(
        { ...fixture, salary: 49_999 },
        {
          minSalary: 50_000,
          minTenureMonths: 12,
          currentDateUnixMs: Date.UTC(2026, 1, 18),
          requiredStatusHash,
        },
      ),
    ).toThrow(/salary .* below required minimum/i);
  });

  it("Given tenure below required threshold When eligibility policy is validated Then it fails with tenure diagnostics", () => {
    const fixture = buildFixture();
    const requiredStatusHash = hashUtf8StringPoseidon("active").toString();

    expect(() =>
      assertEligibilityPolicy(
        {
          ...fixture,
          hire_date_unix: Date.UTC(2026, 1, 10),
        },
        {
          minSalary: 50_000,
          minTenureMonths: 12,
          currentDateUnixMs: Date.UTC(2026, 1, 18),
          requiredStatusHash,
        },
      ),
    ).toThrow(/tenure .* below required minimum/i);
  });

  it("Given status hash mismatch When eligibility policy is validated Then it fails with status diagnostics", () => {
    const fixture = buildFixture();
    const requiredStatusHash = hashUtf8StringPoseidon("active").toString();

    expect(() =>
      assertEligibilityPolicy(
        {
          ...fixture,
          status_hash: hashUtf8StringPoseidon("inactive").toString(),
        },
        {
          minSalary: 50_000,
          minTenureMonths: 12,
          currentDateUnixMs: Date.UTC(2026, 1, 18),
          requiredStatusHash,
        },
      ),
    ).toThrow(/status hash mismatch/i);
  });
});
