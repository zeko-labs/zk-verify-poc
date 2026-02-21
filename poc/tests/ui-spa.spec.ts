import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

describe("ui spa contracts", () => {
  it("Given Nuxt SPA deployment requirements When inspecting Nuxt config Then SSR is explicitly disabled", () => {
    const configPath = resolve(process.cwd(), "ui/nuxt.config.ts");
    expect(existsSync(configPath)).toBe(true);

    const source = readFileSync(configPath, "utf8");
    expect(source).toMatch(/ssr\s*:\s*false/);
  });

  it("Given Cloudflare Worker static deployment requirements When inspecting wrangler config Then worker entrypoint and static assets binding are configured", () => {
    const wranglerPath = resolve(process.cwd(), "ui/wrangler.jsonc");
    expect(existsSync(wranglerPath)).toBe(true);

    const source = readFileSync(wranglerPath, "utf8");
    expect(source).toMatch(/"main"\s*:\s*"\.\/\.output\/server\/index\.mjs"/);
    expect(source).toMatch(/"binding"\s*:\s*"ASSETS"/);
    expect(source).toMatch(/"directory"\s*:\s*"\.\/\.output\/public"/);
  });

  it("Given deploy workflow requirements When inspecting ui Moon tasks Then ui:deploy depends on ui:build", () => {
    const moonPath = resolve(process.cwd(), "ui/moon.yml");
    expect(existsSync(moonPath)).toBe(true);

    const source = readFileSync(moonPath, "utf8");
    expect(source).toMatch(/deploy:\s*\n(?:\s+.*\n)*\s+deps:\s*\n\s+-\s*["']ui:build["']/m);
  });

  it("Given mixed output directory names When selecting run directories Then only timestamp-formatted run directories are retained", async () => {
    const modulePath = resolve(process.cwd(), "ui/modules/proof-output-sync.ts");
    expect(existsSync(modulePath)).toBe(true);

    const moduleUrl = pathToFileURL(modulePath).href;
    const { selectTimestampRunDirs } = await import(moduleUrl);

    expect(
      selectTimestampRunDirs([
        "latest",
        "2026-02-19T04-24-17",
        "notes",
        "2026-02-18T22-03-05",
        ".gitkeep",
      ]),
    ).toEqual(["2026-02-19T04-24-17", "2026-02-18T22-03-05"]);
  });

  it("Given proof outputs When deriving UI status Then outputs map to verified failed and unknown states deterministically", async () => {
    const libPath = resolve(process.cwd(), "ui/lib/proof-data.ts");
    expect(existsSync(libPath)).toBe(true);

    const libUrl = pathToFileURL(libPath).href;
    const { deriveProofStatus } = await import(libUrl);

    expect(deriveProofStatus(["1"])).toBe("verified");
    expect(deriveProofStatus(["0"])).toBe("failed");
    expect(deriveProofStatus([])).toBe("unknown");
  });

  it("Given missing manifest input When normalizing manifest Then an empty manifest shape is returned", async () => {
    const libPath = resolve(process.cwd(), "ui/lib/proof-data.ts");
    expect(existsSync(libPath)).toBe(true);

    const libUrl = pathToFileURL(libPath).href;
    const { normalizeManifest } = await import(libUrl);

    expect(normalizeManifest(undefined)).toEqual({
      generatedAt: null,
      latestRunId: null,
      runs: [],
    });
  });
});
