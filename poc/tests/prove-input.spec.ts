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

const VALID_FIXTURE: DisclosedFieldsFixture = {
  salary: 85_000,
  hire_date_unix: 1_686_787_200_000,
  status_hash: "425066975693549922141733679725481389722356036482752749067457786220237218985",
  data_commitment: "1234357605213887681571516522283666890866308643784466339214911188889297492356",
  ecdsa_signature: {
    r: "10d2cd6d0473c33419478bf071c5b97a3f93f5e9b69db1102f0217c3cd3b3715",
    s: "1d5d94fe820061e7f6f90a04147a1984294e397f999bc2850b7ef2f19c8853d8",
  },
  session_header_bytes:
    "46825a9e1e4db04dea5516d0dffe7c4000000000022048e82c788b93ad9ea5fcb1d26a41842b429f88278727497e491e1987517da559",
  notary_public_key: {
    x: "fac7d8ab2d097d429f572a77ce324add36ccad426425b68cd54777b6f261ca14",
    y: "0f0e1b6a6998bc97e853edd33c919ff3028b9cc1da02bd7236079e74847ba0b2",
  },
};

function buildFixture(): DisclosedFieldsFixture {
  return {
    ...VALID_FIXTURE,
    ecdsa_signature: {
      ...VALID_FIXTURE.ecdsa_signature,
    },
    notary_public_key: {
      ...VALID_FIXTURE.notary_public_key,
    },
  };
}

describe("prove input integrity", () => {
  it("Given valid disclosed fields When integrity is validated Then proving preflight passes", () => {
    const fixture = buildFixture();

    const statusHash = hashUtf8StringPoseidon("active");
    const recomputedCommitment = commitmentHash(
      fixture.salary,
      fixture.hire_date_unix,
      statusHash,
    ).toString();
    expect(recomputedCommitment).toBe(fixture.data_commitment);

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

    expect(() =>
      assertEligibilityPolicy({
        ...fixture,
        salary: 49_999,
      }),
    ).toThrow(/salary .* below required minimum/i);
  });

  it("Given tenure below required threshold When eligibility policy is validated Then it fails with tenure diagnostics", () => {
    const fixture = buildFixture();

    expect(() =>
      assertEligibilityPolicy({
        ...fixture,
        hire_date_unix: Date.UTC(2026, 1, 10),
      }),
    ).toThrow(/tenure .* below required minimum/i);
  });

  it("Given status hash mismatch When eligibility policy is validated Then it fails with status diagnostics", () => {
    const fixture = buildFixture();

    expect(() =>
      assertEligibilityPolicy({
        ...fixture,
        status_hash: hashUtf8StringPoseidon("inactive").toString(),
      }),
    ).toThrow(/status hash mismatch/i);
  });

  it("Given a valid signature under an untrusted key When integrity is validated Then it fails with trusted-key diagnostics", () => {
    const fixture = buildFixture();

    expect(() =>
      validateProofInputIntegrity({
        ...fixture,
        notary_public_key: {
          ...fixture.notary_public_key,
          x: fixture.notary_public_key.x.slice(0, -1) + "f",
        },
      }),
    ).toThrow(/notary public key does not match trusted key/i);
  });
});
