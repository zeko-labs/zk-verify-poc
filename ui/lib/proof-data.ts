export type ProofStatus = "verified" | "failed" | "unknown";

export interface ProofDataManifestRun {
  id: string;
  filesPresent: string[];
  timestamp: string | null;
}

export interface ProofDataManifest {
  generatedAt: string | null;
  latestRunId: string | null;
  runs: ProofDataManifestRun[];
}

interface AttestationPayload {
  session_header_bytes_hex?: string;
  signature?: {
    r_hex?: string;
    s_hex?: string;
  };
  notary_public_key?: {
    x_hex?: string;
    y_hex?: string;
  };
  server_name?: string;
  timestamp?: number;
  signature_alg?: string;
}

interface DisclosedFieldsPayload {
  data_commitment?: string;
  status_hash?: string;
  salary?: number;
  hire_date_unix?: number;
  notary_public_key?: {
    x?: string;
    y?: string;
  };
  ecdsa_signature?: {
    r?: string;
    s?: string;
  };
}

interface ProofPayload {
  min_salary?: number;
  min_tenure_months?: number;
  current_date_unix_ms?: number;
  session_header_length_bytes?: number;
  proof?: {
    publicInput?: string[];
    publicOutput?: string[];
  };
}

interface VerificationKeyPayload {
  hash?: string;
}

interface DeployedAddressPayload {
  zkapp_public_key?: string;
  deploy_tx_hash?: string;
  verification_key_hash?: string;
}

export interface ProofSummary {
  runId: string;
  runDate: string;
  status: ProofStatus;
  proofHash: string | null;
  network: string;
}

export interface ProofRecord {
  runId: string;
  status: ProofStatus;
  proofHash: string | null;
  evaluationDate: string | null;
  attestation: AttestationPayload | null;
  disclosedFields: DisclosedFieldsPayload | null;
  proof: ProofPayload | null;
  verificationKey: VerificationKeyPayload | null;
  deployedAddress: DeployedAddressPayload | null;
}

const DEFAULT_MANIFEST: ProofDataManifest = {
  generatedAt: null,
  latestRunId: null,
  runs: [],
};

const ARTIFACT_FILES = [
  "attestation.json",
  "disclosed-fields.json",
  "proof.json",
  "verification-key.json",
] as const;

const TIMELINE_SECONDS_OFFSETS = [0, 5, 10, 12, 15, 16, 17] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeManifest(input: unknown): ProofDataManifest {
  if (!isObject(input) || !Array.isArray(input.runs)) {
    return { ...DEFAULT_MANIFEST };
  }

  const runs = input.runs
    .filter((entry): entry is Record<string, unknown> => isObject(entry))
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      filesPresent: Array.isArray(entry.filesPresent)
        ? entry.filesPresent.filter((value): value is string => typeof value === "string")
        : [],
      timestamp: typeof entry.timestamp === "string" ? entry.timestamp : null,
    }))
    .filter((entry) => entry.id.length > 0);

  return {
    generatedAt: typeof input.generatedAt === "string" ? input.generatedAt : null,
    latestRunId: typeof input.latestRunId === "string" ? input.latestRunId : null,
    runs,
  };
}

export function deriveProofStatus(publicOutput: string[] | undefined): ProofStatus {
  if (!publicOutput || publicOutput.length === 0) {
    return "unknown";
  }

  return publicOutput[0] === "1" ? "verified" : "failed";
}

export function deriveRunStatus(input: {
  publicOutput?: string[];
  hasDisclosedFields: boolean;
}): ProofStatus {
  const statusFromProof = deriveProofStatus(input.publicOutput);
  if (statusFromProof !== "unknown") {
    return statusFromProof;
  }

  if (input.hasDisclosedFields) {
    return "failed";
  }

  return "unknown";
}

function parseRunIdToDate(runId: string): Date | null {
  const match = runId.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const date = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6]),
    ),
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatUtcDateTime(date: Date): string {
  const year = date.getUTCFullYear();
  const month = pad2(date.getUTCMonth() + 1);
  const day = pad2(date.getUTCDate());
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  const second = pad2(date.getUTCSeconds());

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function formatUtcTime(date: Date): string {
  const hour = pad2(date.getUTCHours());
  const minute = pad2(date.getUTCMinutes());
  const second = pad2(date.getUTCSeconds());

  return `${hour}:${minute}:${second}`;
}

export function runIdToDateLabel(runId: string): string {
  const parsed = parseRunIdToDate(runId);
  if (!parsed) {
    return runId;
  }

  return formatUtcDateTime(parsed);
}

function toDateLabelFromUnixMs(unixMs: number | undefined): string | null {
  if (typeof unixMs !== "number" || Number.isNaN(unixMs)) {
    return null;
  }

  const parsed = new Date(unixMs);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function parseJsonText<T>(input: string | null): T | null {
  if (typeof input !== "string") {
    return null;
  }

  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

async function fetchOptionalJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function fetchOptionalText(path: string): Promise<string | null> {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  }
}

export async function deriveProofArtifactHash(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function deriveDisplayProofHash({
  proofText,
  fallback,
}: {
  proofText: string | null;
  fallback: string | null;
}): Promise<string | null> {
  if (proofText) {
    return deriveProofArtifactHash(proofText);
  }

  return fallback;
}

export async function loadManifest(): Promise<ProofDataManifest> {
  const manifest = await fetchOptionalJson<ProofDataManifest>("/proof-data/manifest.json");
  return normalizeManifest(manifest);
}

export async function loadRunSummary(runId: string): Promise<ProofSummary> {
  const proofPath = `/proof-data/runs/${runId}/proof.json`;
  const [disclosedFields, proofText] = await Promise.all([
    fetchOptionalJson<DisclosedFieldsPayload>(`/proof-data/runs/${runId}/disclosed-fields.json`),
    fetchOptionalText(proofPath),
  ]);

  const proof = parseJsonText<ProofPayload>(proofText);

  const proofHash = await deriveDisplayProofHash({
    proofText,
    fallback: disclosedFields?.data_commitment ?? proof?.proof?.publicInput?.[0] ?? null,
  });

  return {
    runId,
    runDate: runIdToDateLabel(runId),
    status: deriveRunStatus({
      publicOutput: proof?.proof?.publicOutput,
      hasDisclosedFields: disclosedFields !== null,
    }),
    proofHash,
    network: "Zeko Testnet",
  };
}

export async function loadProofRecord(runId: string): Promise<ProofRecord> {
  const proofPath = `/proof-data/runs/${runId}/proof.json`;

  const [attestation, disclosedFields, proofText, verificationKey, deployedAddress] =
    await Promise.all([
      fetchOptionalJson<AttestationPayload>(`/proof-data/runs/${runId}/attestation.json`),
      fetchOptionalJson<DisclosedFieldsPayload>(`/proof-data/runs/${runId}/disclosed-fields.json`),
      fetchOptionalText(proofPath),
      fetchOptionalJson<VerificationKeyPayload>(`/proof-data/runs/${runId}/verification-key.json`),
      fetchOptionalJson<DeployedAddressPayload>("/proof-data/deployed-address.json"),
    ]);

  const proof = parseJsonText<ProofPayload>(proofText);

  const proofHash = await deriveDisplayProofHash({
    proofText,
    fallback: disclosedFields?.data_commitment ?? proof?.proof?.publicInput?.[0] ?? null,
  });

  return {
    runId,
    status: deriveRunStatus({
      publicOutput: proof?.proof?.publicOutput,
      hasDisclosedFields: disclosedFields !== null,
    }),
    proofHash,
    evaluationDate:
      toDateLabelFromUnixMs(proof?.current_date_unix_ms) ??
      runIdToDateLabel(runId).split(" ")[0] ??
      runId,
    attestation,
    disclosedFields,
    proof,
    verificationKey,
    deployedAddress,
  };
}

export function artifactEntries(run: ProofDataManifestRun) {
  const filesPresent = new Set(run.filesPresent);

  return ARTIFACT_FILES.map((fileName) => ({
    fileName,
    available: filesPresent.has(fileName),
    href: `/proof-data/runs/${run.id}/${fileName}`,
  }));
}

const PIPELINE_STAGES = [
  {
    stage: "Mock Server Started",
    description: "HTTPS fixture server with employment data",
  },
  {
    stage: "TLSNotary Attestation",
    description: "Notary witnessed TLS session with employer API",
  },
  {
    stage: "Field Extraction",
    description: "Disclosed fields extracted from attestation",
  },
  {
    stage: "Data Commitment",
    description: "Poseidon hash computed over field elements",
  },
  {
    stage: "ZK Proof Generation",
    description: "Employment eligibility circuit compiled and proved",
  },
  {
    stage: "Proof Verification",
    description: "Proof verified against verification key",
  },
  {
    stage: "On-Chain Settlement",
    description: "Proof and result settled to Zeko testnet",
  },
] as const;

export function buildPipelineTimeline(runId: string) {
  const runDate = parseRunIdToDate(runId);
  const startDate = runDate ? new Date(runDate.getTime() - 17_000) : null;

  return PIPELINE_STAGES.map((entry, index) => ({
    ...entry,
    time:
      startDate === null
        ? "--:--:--"
        : formatUtcTime(new Date(startDate.getTime() + TIMELINE_SECONDS_OFFSETS[index] * 1_000)),
  }));
}

export const PIPELINE_TIMELINE = buildPipelineTimeline("2026-02-19T04-24-17");
