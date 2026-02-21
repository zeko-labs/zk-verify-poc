import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { deriveProofStatus, normalizeManifest } from "../lib/proof-data";
import { selectTimestampRunDirs } from "../modules/proof-output-sync";

describe("ui contract behavior", () => {
  it("Given Nuxt SPA requirements When reading ui/nuxt.config.ts Then SSR is explicitly disabled", () => {
    const configPath = resolve(process.cwd(), "nuxt.config.ts");
    const source = readFileSync(configPath, "utf8");

    expect(source).toMatch(/ssr\s*:\s*false/);
  });

  it("Given mixed output names When selecting timestamp run directories Then only timestamp directories are retained", () => {
    expect(
      selectTimestampRunDirs(["latest", "notes", "2026-02-19T04-24-17", "2026-02-18T22-03-05"]),
    ).toEqual(["2026-02-19T04-24-17", "2026-02-18T22-03-05"]);
  });

  it("Given proof outputs When deriving status Then verified failed and unknown are mapped deterministically", () => {
    expect(deriveProofStatus(["1"])).toBe("verified");
    expect(deriveProofStatus(["0"])).toBe("failed");
    expect(deriveProofStatus([])).toBe("unknown");
  });

  it("Given missing manifest data When normalizing manifest Then empty defaults are returned", () => {
    expect(normalizeManifest(undefined)).toEqual({
      generatedAt: null,
      latestRunId: null,
      runs: [],
    });
  });

  it("Given run directory identifiers When formatting for UI Then full datetime is preserved", async () => {
    const proofLib = await import("../lib/proof-data");
    expect(proofLib.runIdToDateLabel("2026-02-19T04-24-17")).toBe("2026-02-19 04:24:17");
  });

  it("Given proof artifact payload text When normalizing for UI display Then minified proof text is returned", async () => {
    const proofLib = await import("../lib/proof-data");

    expect(typeof (proofLib as Record<string, unknown>).normalizeProofPayload).toBe("function");

    const normalizeProofPayload = (
      proofLib as { normalizeProofPayload?: (input: string | null) => string | null }
    ).normalizeProofPayload;

    if (!normalizeProofPayload) {
      return;
    }

    expect(normalizeProofPayload('{\n  "proof":"sample"\n}\n')).toBe('{"proof":"sample"}');
    expect(normalizeProofPayload(null)).toBeNull();
  });

  it("Given proof preview requirements When selecting preview source Then proof payload property is preferred over whole JSON text", async () => {
    const proofLib = await import("../lib/proof-data");
    const extractProofPreviewValue = (
      proofLib as {
        extractProofPreviewValue?: (
          proof: {
            proof?: { proof?: string; publicInput?: string[] };
          } | null,
        ) => string | null;
      }
    ).extractProofPreviewValue;

    expect(typeof extractProofPreviewValue).toBe("function");

    if (!extractProofPreviewValue) {
      return;
    }

    expect(
      extractProofPreviewValue({
        proof: {
          proof: "proof-bytes",
          publicInput: ["1"],
        },
      }),
    ).toBe("proof-bytes");

    expect(
      extractProofPreviewValue({
        proof: {
          publicInput: ["1"],
        },
      }),
    ).toBe('{"publicInput":["1"]}');
  });

  it("Given timestamp-named run directories When filtering by renderable artifact sets Then ineligible runs are included and unknown-only runs are excluded", async () => {
    const syncModule = await import("../modules/proof-output-sync");
    const selectCompleteTimestampRunDirs = (
      syncModule as {
        selectCompleteTimestampRunDirs?: (
          runEntries: Array<{ id: string; filesPresent: string[] }>,
        ) => string[];
      }
    ).selectCompleteTimestampRunDirs;

    expect(typeof selectCompleteTimestampRunDirs).toBe("function");

    if (!selectCompleteTimestampRunDirs) {
      return;
    }

    expect(
      selectCompleteTimestampRunDirs([
        {
          id: "2026-02-19T04-24-17",
          filesPresent: [
            "attestation.json",
            "disclosed-fields.json",
            "proof.json",
            "verification-key.json",
          ],
        },
        {
          id: "2026-02-19T06-11-06",
          filesPresent: ["attestation.json", "disclosed-fields.json"],
        },
        { id: "2026-02-19T03-59-59", filesPresent: ["tlsnotary-notary.log"] },
      ]),
    ).toEqual(["2026-02-19T06-11-06", "2026-02-19T04-24-17"]);
  });

  it("Given duplicate complete run ids When filtering renderable run directories Then duplicate run ids are removed", async () => {
    const syncModule = await import("../modules/proof-output-sync");
    const selectCompleteTimestampRunDirs = (
      syncModule as {
        selectCompleteTimestampRunDirs?: (
          runEntries: Array<{ id: string; filesPresent: string[] }>,
        ) => string[];
      }
    ).selectCompleteTimestampRunDirs;

    expect(typeof selectCompleteTimestampRunDirs).toBe("function");

    if (!selectCompleteTimestampRunDirs) {
      return;
    }

    expect(
      selectCompleteTimestampRunDirs([
        {
          id: "2026-02-19T04-24-17",
          filesPresent: ["attestation.json", "disclosed-fields.json", "proof.json"],
        },
        {
          id: "2026-02-19T04-24-17",
          filesPresent: ["attestation.json", "disclosed-fields.json", "proof.json"],
        },
      ]),
    ).toEqual(["2026-02-19T04-24-17"]);
  });

  it("Given ineligible artifact presence When deriving run status Then missing proof output is classified as failed", async () => {
    const proofLib = await import("../lib/proof-data");
    const deriveRunStatus = (
      proofLib as {
        deriveRunStatus?: (input: {
          publicOutput?: string[];
          hasDisclosedFields: boolean;
        }) => string;
      }
    ).deriveRunStatus;

    expect(typeof deriveRunStatus).toBe("function");

    if (!deriveRunStatus) {
      return;
    }

    expect(
      deriveRunStatus({
        publicOutput: undefined,
        hasDisclosedFields: true,
      }),
    ).toBe("failed");
  });

  it("Given full-record on-chain section requirements When inspecting detail page source Then ZekoScan transaction and account links are present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );

    expect(source).toContain("https://zekoscan.io/testnet/account/");
    expect(source).toContain("https://zekoscan.io/testnet/tx/");
  });

  it("Given settlement metadata requirements When inspecting proof record contracts Then settlement tx data is not sourced from deploy_tx_hash", () => {
    const detailSource = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );
    const proofDataSource = readFileSync(resolve(process.cwd(), "lib/proof-data.ts"), "utf8");

    expect(proofDataSource).toContain("settlement.json");
    expect(detailSource).toContain('label: "Deploy Tx Hash"');
    expect(detailSource).not.toContain("const txHash = deployed?.deploy_tx_hash ?? null;");
  });

  it("Given detail pipeline rendering requirements When inspecting detail page source Then ordered list rendering is used instead of timestamp timeline entries", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );

    expect(source).toContain("pipeline-steps");
    expect(source).toContain("<ol");
    expect(source).not.toContain("PipelineTimeline");
    expect(source).not.toContain("timeline-time");
  });

  it("Given ineligible pipeline requirements When inspecting detail page source Then ineligible-only step copy is present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );

    expect(source).toContain("Proof generation was skipped");
    expect(source).toContain("Failure artifacts were retained for auditing");
  });

  it("Given full-record attestation requirements When inspecting detail page source Then notary key and signature values are not truncated", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );

    expect(source).toContain("x: ${attestation.notary_public_key.x_hex}");
    expect(source).toContain("r: ${attestation.signature.r_hex}");
    expect(source).not.toContain("attestation.notary_public_key.x_hex.slice");
    expect(source).not.toContain("attestation.signature.r_hex.slice");
  });

  it("Given baseline app chrome requirements When inspecting root app shell Then footer markup is present", () => {
    const source = readFileSync(resolve(process.cwd(), "app/app.vue"), "utf8");
    expect(source).toContain("<footer");
    expect(source).toContain("zkVerify PoC");
  });

  it("Given dynamic timeline rendering usage When inspecting proof-data exports Then static PIPELINE_TIMELINE export is removed", () => {
    const source = readFileSync(resolve(process.cwd(), "lib/proof-data.ts"), "utf8");
    expect(source).not.toContain("export const PIPELINE_TIMELINE");
  });

  it("Given ineligible certificate overview requirements When inspecting overview source Then non-eligibility copy is present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );

    expect(source).toContain("does not satisfy eligibility policy requirements");
  });

  it("Given certificate trust-card state requirements When inspecting overview source Then card border tone logic is status-aware", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );

    expect(source).toContain("function trustCardTone");
    expect(source).toContain('if (status.value === "verified")');
    expect(source).toContain('index === 1 ? "positive" : "negative"');
  });

  it("Given proof field UX requirements When inspecting overview source Then clipboard icon button and clipboard behavior are present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );

    expect(source).toContain("copy-proof-icon");
    expect(source).toContain('aria-label="Copy full proof to clipboard"');
    expect(source).toContain("navigator.clipboard.writeText");
    expect(source).not.toContain("Copy Full Proof");
  });

  it("Given overview CTA style requirements When inspecting overview source Then CTA copy is uppercase and centered class is present", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );

    expect(source).toContain("VIEW FULL CRYPTOGRAPHIC RECORD");
    expect(source).toContain("action-link-center");
  });

  it("Given ineligible run status When selecting proof field value Then ineligible values are empty", async () => {
    const proofLib = await import("../lib/proof-data");
    const selectProofFieldValue = (
      proofLib as {
        selectProofFieldValue?: (
          status: "verified" | "failed" | "unknown",
          normalizedProofValue: string | null,
        ) => string | null;
      }
    ).selectProofFieldValue;

    expect(typeof selectProofFieldValue).toBe("function");

    if (!selectProofFieldValue) {
      return;
    }

    expect(selectProofFieldValue("failed", '{"proof":"sample"}')).toBeNull();
    expect(selectProofFieldValue("verified", '{"proof":"sample"}')).toBe('{"proof":"sample"}');
  });

  it("Given directory row alignment requirements When inspecting directory page source Then fixed grid track definitions use minmax columns", () => {
    const source = readFileSync(resolve(process.cwd(), "app/pages/index.vue"), "utf8");

    expect(source).toContain("--directory-columns");
    expect(source).toContain("minmax(0, 1fr)");
    expect(source).toContain("directory-cell");
  });

  it("Given directory table requirements When inspecting directory page source Then proof column and indicators are removed", () => {
    const source = readFileSync(resolve(process.cwd(), "app/pages/index.vue"), "utf8");

    expect(source).not.toContain('<span class="directory-cell">Proof</span>');
    expect(source).not.toContain('run.proofHash ? "✓" : "✕"');
    expect(source).not.toContain("proof-indicator");
    expect(source).toContain(
      "--directory-columns: minmax(0, 1fr) minmax(0, 3fr) minmax(0, 1.7fr) minmax(0, 1.8fr)",
    );
  });

  it("Given directory mobile layout requirements When inspecting directory page source Then mobile field labels and row-card styles are present", () => {
    const source = readFileSync(resolve(process.cwd(), "app/pages/index.vue"), "utf8");

    expect(source).toContain("directory-mobile-label");
    expect(source).toContain(".directory-mobile-label {");
    expect(source).toContain("display: none;");
    expect(source).toContain("@media (max-width: 1024px)");
    expect(source).toContain(".directory-row-link {");
    expect(source).toContain("border: 1px solid #284363;");
  });

  it("Given page-level styling requirements When inspecting route components Then each page declares a local style block", () => {
    const directorySource = readFileSync(resolve(process.cwd(), "app/pages/index.vue"), "utf8");
    const overviewSource = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/index.vue"),
      "utf8",
    );
    const detailSource = readFileSync(
      resolve(process.cwd(), "app/pages/proof/[runId]/detail.vue"),
      "utf8",
    );
    const mainCss = readFileSync(resolve(process.cwd(), "app/assets/css/main.css"), "utf8");

    expect(directorySource).toContain("<style");
    expect(overviewSource).toContain("<style");
    expect(detailSource).toContain("<style");
    expect(mainCss).not.toContain(".directory-table");
    expect(mainCss).not.toContain(".certificate-card");
    expect(mainCss).not.toContain(".detail-block");
  });

  it("Given multiline key-value rendering requirements When inspecting key value grid component Then line breaks are preserved for long values", () => {
    const source = readFileSync(resolve(process.cwd(), "app/components/KeyValueGrid.vue"), "utf8");

    expect(source).toContain('class="kv-text"');
    expect(source).toContain("white-space: pre-wrap");
  });

  it("Given UI typecheck requirements When inspecting ui moon task config Then typecheck target exists and validate depends on it", () => {
    const moonConfig = readFileSync(resolve(process.cwd(), "moon.yml"), "utf8");

    expect(moonConfig).toContain("typecheck:");
    expect(moonConfig).toContain("pnpm exec nuxi typecheck");
    expect(moonConfig).toContain('- "ui:typecheck"');
  });
});
