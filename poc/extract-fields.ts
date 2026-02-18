import { buildDisclosedFields } from "./lib/disclosure.js";
import { readJsonFile, writeJsonFile } from "./lib/io.js";

const ATTESTATION_PATH = "output/attestation.json";
const DISCLOSED_PATH = "output/disclosed-fields.json";

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
