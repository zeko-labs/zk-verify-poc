import { describe, expect, it } from "vitest";

import { buildDisclosedFields } from "../lib/disclosure.js";
import { hashUtf8StringPoseidon } from "../lib/poseidon.js";

describe("field extraction and disclosure", () => {
  it("Given attested employee payload When transformed Then disclosed fields and commitment are deterministic", () => {
    const disclosed = buildDisclosedFields({
      session_header_bytes_hex: "aa",
      signature: { r_hex: "bb", s_hex: "cc" },
      notary_public_key: { x_hex: "dd", y_hex: "ee" },
      response_body:
        '{"employee_id":"EMP-001","annual_salary":85000,"hire_date":"2023-06-15","employment_status":"active"}',
      server_name: "localhost",
      timestamp: 1700000000,
    });

    expect(disclosed.salary).toBe(85000);
    expect(disclosed.hire_date_unix).toBe(1686787200000);
    expect(disclosed.status_hash).toBe(hashUtf8StringPoseidon("active").toString());
    expect(disclosed.response_body_hash.length).toBeGreaterThan(0);
    expect(disclosed.data_commitment.length).toBeGreaterThan(0);
    expect(disclosed.ecdsa_signature.r).toBe("bb");
  });
});
