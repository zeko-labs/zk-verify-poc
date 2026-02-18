import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("repo-local skills docs portability", () => {
  it("Given skills install instructions When inspected Then no machine-specific absolute paths are documented", () => {
    const source = readFileSync(".agents/skills/README.md", "utf8");

    expect(source).not.toContain("/Users/hebilicious/");
    expect(source).toMatch(/\$HOME|\$\(pwd\)/);
  });
});
