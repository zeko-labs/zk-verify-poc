import { buildDisclosedFields } from "./lib/disclosure.js";
import { readJsonFile, writeJsonFile } from "./lib/io.js";
import { outputDir } from "./lib/paths.js";

const ATTESTATION_PATH = `${outputDir()}/attestation.json`;
const DISCLOSED_PATH = `${outputDir()}/disclosed-fields.json`;

async function main(): Promise<void> {
  const attestation = await readJsonFile<unknown>(ATTESTATION_PATH);
  const disclosed = buildDisclosedFields(attestation);

  await writeJsonFile(DISCLOSED_PATH, disclosed);

  console.log(
    `[extract-fields] Disclosed annual_salary=${disclosed.salary}, hire_date_unix=${disclosed.hire_date_unix}`,
  );
  console.log("[extract-fields] Saved output/disclosed-fields.json");
}

main().catch((error: unknown) => {
  console.error("[extract-fields] failed:", error);
  process.exit(1);
});
