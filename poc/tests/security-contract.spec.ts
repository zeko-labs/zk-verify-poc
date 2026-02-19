import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("contract and circuit security contracts", () => {
  it("Given VerificationRegistry source When inspected Then decorator-based state and method declarations are used with EligibilityProof verification", () => {
    const source = readFileSync("poc/contracts/VerificationRegistry.ts", "utf8");

    expect(source).toMatch(/@state\(Field\)\s+lastProofHash\s*=\s*State<Field>\(\)/);
    expect(source).toMatch(/@state\(Field\)\s+lastResult\s*=\s*State<Field>\(\)/);
    expect(source).toMatch(/@method\s+async\s+recordVerification\(/);
    expect(source).toMatch(
      /async recordVerification\(proofHash: Field,\s*proof: EligibilityProof\)/,
    );
    expect(source).toMatch(/proof\.verify\(\)/);
    expect(source).not.toMatch(/\bdeclareState\s*\(/);
    expect(source).not.toMatch(/\bdeclareMethods\s*\(/);
  });

  it("Given eligibility circuit source When inspected Then private inputs exclude prover-chosen notary key and policy parameters", () => {
    const source = readFileSync("poc/circuits/eligibility.ts", "utf8");

    expect(source).toMatch(
      /privateInputs:\s*\[\s*UInt64,\s*UInt64,\s*Field,\s*EcdsaSignature,\s*SessionHeaderBytes\s*\]/s,
    );
    expect(source).toMatch(/TRUSTED_NOTARY_PUBLIC_KEY_X_HEX/);
    expect(source).toMatch(/TRUSTED_NOTARY_PUBLIC_KEY_Y_HEX/);
    expect(source).not.toMatch(/\bnotaryPublicKey\b/);
    expect(source).not.toMatch(/\bminSalary\b/);
    expect(source).not.toMatch(/\bminTenureMonths\b/);
    expect(source).not.toMatch(/\bcurrentDateUnix\b/);
    expect(source).not.toMatch(/\brequiredStatusHash\b/);
  });
});
