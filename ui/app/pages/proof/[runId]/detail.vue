<script setup lang="ts">
import { computed } from "vue";

import {
  artifactEntries,
  buildPipelineTimeline,
  loadManifest,
  loadProofRecord,
} from "~~/lib/proof-data";

const route = useRoute();

const runId = computed(() => String(route.params.runId ?? ""));

const breadcrumbs = computed(() => [
  { label: "Directory", to: "/" },
  { label: "Certificate", to: `/proof/${runId.value}` },
  { label: "Full Record" },
]);

const { data, pending } = await useAsyncData(
  () => `proof-detail-${runId.value}`,
  async () => {
    const [record, manifest] = await Promise.all([
      loadProofRecord(runId.value),
      loadManifest(),
    ]);

    return { record, manifest };
  },
  {
    watch: [runId],
  },
);

const runManifest = computed(() =>
  data.value?.manifest.runs.find((run) => run.id === runId.value),
);

const artifactItems = computed(() => {
  if (!runManifest.value) {
    return [];
  }

  return artifactEntries(runManifest.value);
});

const resultValue = computed(() => {
  if (data.value?.record.status === "verified") {
    return "true (Verified)";
  }

  if (data.value?.record.status === "failed") {
    return "false (Failed)";
  }

  return "unknown";
});

const statusItems = computed(() => [
  {
    label: "Result",
    value: resultValue.value,
    mono: true,
    highlight: data.value?.record.status === "verified",
  },
  {
    label: "Evaluation Date",
    value: data.value?.record.evaluationDate ?? "N/A",
    mono: true,
  },
]);

const attestationItems = computed(() => {
  const attestation = data.value?.record.attestation;

  return [
    {
      label: "Signature Algorithm",
      value: attestation?.signature_alg ?? "N/A",
      mono: true,
    },
    {
      label: "Attested Server",
      value: attestation?.server_name ? `${attestation.server_name}:4443` : "N/A",
    },
    {
      label: "Notary Public Key",
      value:
        attestation?.notary_public_key?.x_hex && attestation?.notary_public_key?.y_hex
          ? `${attestation.notary_public_key.x_hex.slice(0, 24)}...`
          : "N/A",
      mono: true,
    },
    {
      label: "ECDSA Signature",
      value: attestation?.signature?.r_hex ? `${attestation.signature.r_hex.slice(0, 24)}...` : "N/A",
      mono: true,
    },
  ];
});

const zkItems = computed(() => {
  const proof = data.value?.record.proof;

  return [
    {
      label: "Circuit Name",
      value: "employment-eligibility",
      mono: true,
      highlight: true,
    },
    {
      label: "Minimum Salary",
      value:
        typeof proof?.min_salary === "number"
          ? `$${proof.min_salary.toLocaleString("en-US")}`
          : "$50,000",
    },
    {
      label: "Minimum Tenure",
      value:
        typeof proof?.min_tenure_months === "number"
          ? `${proof.min_tenure_months} months`
          : "12 months",
      mono: true,
    },
    {
      label: "Session Header Length",
      value:
        typeof proof?.session_header_length_bytes === "number"
          ? `${proof.session_header_length_bytes} bytes`
          : "N/A",
      mono: true,
    },
  ];
});

const onChainItems = computed(() => {
  const deployed = data.value?.record.deployedAddress;
  const zkAppAddress = deployed?.zkapp_public_key ?? null;
  const txHash = deployed?.deploy_tx_hash ?? null;

  return [
    {
      label: "Network",
      value: "Zeko Testnet",
    },
    {
      label: "zkApp Address",
      value: zkAppAddress ?? "N/A",
      href: zkAppAddress
        ? `https://zekoscan.io/testnet/account/${zkAppAddress}`
        : undefined,
      external: true,
      mono: true,
    },
    {
      label: "Settlement Tx Hash",
      value: txHash ?? "N/A",
      href: txHash ? `https://zekoscan.io/testnet/tx/${txHash}` : undefined,
      external: true,
      mono: true,
    },
    {
      label: "Proof Hash",
      value: data.value?.record.proofHash ?? "N/A",
      mono: true,
    },
  ];
});

const timelineItems = computed(() => buildPipelineTimeline(runId.value));
</script>

<template>
  <main class="content-page">
    <section class="content-container detail-shell">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(crumb, index) in breadcrumbs" :key="`${crumb.label}-${index}`">
          <NuxtLink v-if="crumb.to" :to="crumb.to" class="crumb-link">
            {{ crumb.label }}
          </NuxtLink>
          <span v-else class="crumb-current">{{ crumb.label }}</span>
          <span v-if="index < breadcrumbs.length - 1" class="crumb-separator">/</span>
        </template>
      </nav>

      <h1 class="record-title">Cryptographic Verification Record</h1>

      <p v-if="pending" class="panel-message">Loading full record...</p>

      <section v-else class="detail-stack">
        <details open class="detail-block">
          <summary>1. Certificate Status</summary>
          <div class="detail-content">
            <KeyValueGrid :items="statusItems" />
          </div>
        </details>

        <details class="detail-block">
          <summary>2. Data Attestation</summary>
          <div class="detail-content">
            <KeyValueGrid :items="attestationItems" />
          </div>
        </details>

        <details class="detail-block">
          <summary>3. Disclosed Fields (Privacy Layer)</summary>
          <div class="detail-content">
            <div class="privacy-box">
              <p><strong>Salary threshold</strong> proven without revealing the raw salary.</p>
              <p><strong>Tenure threshold</strong> proven without revealing the hire date.</p>
              <p><strong>Employment status</strong> proven as active in-circuit.</p>
            </div>
          </div>
        </details>

        <details class="detail-block">
          <summary>4. ZK Computation</summary>
          <div class="detail-content">
            <KeyValueGrid :items="zkItems" />
          </div>
        </details>

        <details class="detail-block">
          <summary>5. On-Chain Settlement</summary>
          <div class="detail-content">
            <KeyValueGrid :items="onChainItems" />
          </div>
        </details>

        <details class="detail-block">
          <summary>6. Pipeline Timeline</summary>
          <div class="detail-content">
            <PipelineTimeline :items="timelineItems" />
          </div>
        </details>

        <details class="detail-block">
          <summary>7. Raw Artifacts</summary>
          <div class="detail-content">
            <ArtifactLinks :items="artifactItems" />
          </div>
        </details>
      </section>
    </section>
  </main>
</template>
