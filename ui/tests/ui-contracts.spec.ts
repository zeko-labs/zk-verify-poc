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

  it("Given proof artifact payload text When deriving display hash Then a non-placeholder digest is produced", async () => {
    const proofLib = await import("../lib/proof-data");

    expect(typeof (proofLib as Record<string, unknown>).deriveProofArtifactHash).toBe("function");

    const deriveProofArtifactHash = (
      proofLib as { deriveProofArtifactHash?: (input: string) => Promise<string> }
    ).deriveProofArtifactHash;

    if (!deriveProofArtifactHash) {
      return;
    }

    const digest = await deriveProofArtifactHash('{"proof":"sample"}');
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digest).not.toBe(
      "1234357605213887681571516522283666890866308643784466339214911188889297492356",
    );
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

  it("Given timeline rendering requirements When building timeline entries Then times are derived from the run id instead of fixed placeholders", async () => {
    const proofLib = await import("../lib/proof-data");
    const buildPipelineTimeline = (
      proofLib as {
        buildPipelineTimeline?: (runId: string) => Array<{ time: string }>;
      }
    ).buildPipelineTimeline;

    expect(typeof buildPipelineTimeline).toBe("function");

    if (!buildPipelineTimeline) {
      return;
    }

    const timeline = buildPipelineTimeline("2026-02-19T04-24-17");
    expect(timeline[0]?.time).toBe("04:24:00");
    expect(timeline[1]?.time).toBe("04:24:05");
    expect(timeline[2]?.time).toBe("04:24:10");
    expect(timeline[6]?.time).toBe("04:24:17");
  });

  it("Given baseline app chrome requirements When inspecting root app shell Then footer markup is present", () => {
    const source = readFileSync(resolve(process.cwd(), "app/app.vue"), "utf8");
    expect(source).toContain("<footer");
    expect(source).toContain("zkVerify PoC");
  });
});
