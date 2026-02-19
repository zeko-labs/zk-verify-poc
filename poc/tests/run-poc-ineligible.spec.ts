import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function createPipelineStub(tempDir: string, scriptBody: string): string {
  const stubPath = join(tempDir, "pipeline-stub.sh");
  writeFileSync(stubPath, scriptBody, "utf8");
  chmodSync(stubPath, 0o755);
  return stubPath;
}

describe("ineligible pipeline task contracts", () => {
  it("Given workspace Moon task definitions When inspected Then run-ineligible invokes run-poc-ineligible.sh", () => {
    const source = readFileSync("moon.yml", "utf8");

    expect(source).toMatch(/run-ineligible:\s*\n\s*command:\s*['"]\.\/run-poc-ineligible\.sh['"]/m);
  });

  it("Given an expected prove-stage rejection When run-poc-ineligible.sh executes Then it exits successfully", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "run-poc-ineligible-"));
    const stubPath = createPipelineStub(
      tempDir,
      `#!/bin/bash
set -euo pipefail
echo "endpoint:\${TLSN_ENDPOINT:-unset}"
echo "[run-poc] failed at step: poc:prove" >&2
echo "[prove] failed: Error: salary 49000 is below required minimum 50000" >&2
exit 1
`,
    );

    const result = spawnSync("bash", ["run-poc-ineligible.sh"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUN_POC_INELIGIBLE_PIPELINE_CMD: stubPath,
      },
      encoding: "utf8",
      timeout: 30_000,
    });

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    expect(result.status).toBe(0);
    expect(output).toContain("endpoint:/api/v1/employee/EMP-002");
    expect(output).toContain("proof rejected as expected");
  });

  it("Given a failure outside prove stage When run-poc-ineligible.sh executes Then it exits with diagnostics", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "run-poc-ineligible-"));
    const stubPath = createPipelineStub(
      tempDir,
      `#!/bin/bash
set -euo pipefail
echo "[run-poc] failed at step: tlsnotary:prover" >&2
exit 1
`,
    );

    const result = spawnSync("bash", ["run-poc-ineligible.sh"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RUN_POC_INELIGIBLE_PIPELINE_CMD: stubPath,
      },
      encoding: "utf8",
      timeout: 30_000,
    });

    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    expect(result.status).not.toBe(0);
    expect(output).toContain("expected failure step: poc:prove");
  });
});
