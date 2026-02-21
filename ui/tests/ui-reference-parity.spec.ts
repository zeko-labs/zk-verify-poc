import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("ui reference parity", () => {
  it("Given index reference branding When inspecting index page source Then proof explorer brand copy and column labels are present", () => {
    const source = readFileSync(resolve(process.cwd(), "app/pages/index.vue"), "utf8");

    expect(source).toContain("PROOF_EXPLORER");
    expect(source).toContain("Circuit Name");
  });

  it("Given overview reference navigation When inspecting overview page source Then certificate overview breadcrumb label is present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );

    expect(source).toContain("Certificate Overview");
    expect(source).toContain("VIEW FULL CRYPTOGRAPHIC RECORD");
  });

  it("Given detail reference section labels When inspecting detail page source Then privacy-layer and full-record labels are present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );

    expect(source).toContain("Full Record");
    expect(source).toContain("3. Disclosed Fields (Privacy Layer)");
  });

  it("Given reference visual baseline When inspecting global css Then canonical grid tokens are present", () => {
    const source = readFileSync(resolve(process.cwd(), "app/assets/css/main.css"), "utf8");

    expect(source).toContain("--bg-base: #070a0f");
    expect(source).toContain("background-image:");
    expect(source).toContain("linear-gradient(var(--bg-line) 1px, transparent 1px)");
  });
});
