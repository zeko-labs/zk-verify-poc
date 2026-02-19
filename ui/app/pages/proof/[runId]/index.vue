<script setup lang="ts">
import { computed } from "vue";

import { loadProofRecord } from "~~/lib/proof-data";

const route = useRoute();

const runId = computed(() => String(route.params.runId ?? ""));

const { data: record, pending } = await useAsyncData(
  () => `proof-overview-${runId.value}`,
  () => loadProofRecord(runId.value),
  {
    watch: [runId],
  },
);

const status = computed(() => record.value?.status ?? "unknown");

const statusLabel = computed(() => {
  if (status.value === "verified") {
    return "VERIFIED";
  }

  if (status.value === "failed") {
    return "FAILED";
  }

  return "UNKNOWN";
});

const statusIcon = computed(() => {
  if (status.value === "verified") {
    return "✓";
  }

  if (status.value === "failed") {
    return "✕";
  }

  return "•";
});
</script>

<template>
  <main class="content-page">
    <section class="content-container overview-shell">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <NuxtLink to="/" class="crumb-link">Directory</NuxtLink>
        <span class="crumb-separator">/</span>
        <span class="crumb-current">Certificate Overview</span>
      </nav>

      <p v-if="pending" class="panel-message">Loading certificate...</p>

      <article v-else class="certificate-card">
        <header class="certificate-top">
          <span class="hero-status" :class="`is-${status}`">
            <span aria-hidden="true">{{ statusIcon }}</span>
            <span>{{ statusLabel }}</span>
          </span>
          <h1>Employment Eligibility Record</h1>
          <p class="certificate-subtitle">
            Cryptographically proven policy adherence without data disclosure.
          </p>
        </header>

        <section class="trust-grid">
          <article class="trust-card">
            <p class="trust-icon" aria-hidden="true">🔐</p>
            <h2>1. Data Attestation</h2>
            <p>
              Origin data was directly witnessed from the employer API via TLSNotary.
              Manipulation is cryptographically impossible.
            </p>
          </article>

          <article class="trust-card">
            <p class="trust-icon" aria-hidden="true">🛡️</p>
            <h2>2. Zero-Knowledge Proof</h2>
            <p>
              Eligibility math was computed locally. Result is guaranteed correct while
              keeping exact salary and dates entirely hidden.
            </p>
          </article>

          <article class="trust-card">
            <p class="trust-icon" aria-hidden="true">⛓</p>
            <h2>3. On-Chain Settlement</h2>
            <p>
              The verification proof is permanently anchored to the Zeko Testnet for
              immutable public auditing.
            </p>
          </article>
        </section>

        <dl class="certificate-meta mono">
          <dt>Evaluation Date</dt>
          <dd>{{ record?.evaluationDate ?? "N/A" }}</dd>

          <dt>Run Directory</dt>
          <dd>{{ runId }}</dd>

          <dt>Circuit Name</dt>
          <dd class="highlight">employment-eligibility</dd>

          <dt>Proof Hash</dt>
          <dd class="meta-break">{{ record?.proofHash ?? "N/A" }}</dd>
        </dl>

        <NuxtLink :to="`/proof/${runId}/detail`" class="action-link">
          View Full Cryptographic Record →
        </NuxtLink>
      </article>
    </section>
  </main>
</template>
