<script setup lang="ts">
import { computed } from "vue";

import {
    loadManifest,
    loadRunSummary,
    normalizeManifest,
} from "~~/lib/proof-data";

const { data, pending } = await useAsyncData(
    "proof-directory",
    async () => {
        const manifest = await loadManifest();
        const runs = await Promise.all(
            manifest.runs.map((run) => loadRunSummary(run.id)),
        );

        return {
            manifest,
            runs,
        };
    },
    {
        default: () => ({
            manifest: normalizeManifest(undefined),
            runs: [],
        }),
    },
);

const orderedRuns = computed(() =>
    [...data.value.runs].sort((left, right) =>
        right.runId.localeCompare(left.runId),
    ),
);

const totalCount = computed(() => orderedRuns.value.length);
const verifiedCount = computed(
    () => orderedRuns.value.filter((run) => run.status === "verified").length,
);
const failedCount = computed(
    () => orderedRuns.value.filter((run) => run.status === "failed").length,
);
const visibleRuns = computed(() => orderedRuns.value);

function truncateHash(hash: string | null): string {
    if (!hash) {
        return "N/A";
    }

    if (hash.length <= 24) {
        return hash;
    }

    return `${hash.slice(0, 14)}...${hash.slice(-7)}`;
}

function formatCount(value: number): string {
    return value.toLocaleString("en-US");
}
</script>

<template>
    <main class="directory-page">
        <section class="directory-container">
            <header class="directory-header">
                <h1 class="directory-brand">
                    <span class="brand-name">zkVerify</span>
                    <span class="brand-divider">//</span>
                    <span class="brand-mark">PROOF_EXPLORER</span>
                </h1>

                <section class="stats-row">
                    <article class="stat-chip">
                        <span>Total</span>
                        <strong>{{ formatCount(totalCount) }}</strong>
                    </article>
                    <article class="stat-chip">
                        <span>Verified</span>
                        <strong class="stat-positive">{{
                            formatCount(verifiedCount)
                        }}</strong>
                    </article>
                    <article class="stat-chip">
                        <span>Failed</span>
                        <strong class="stat-negative">{{
                            formatCount(failedCount)
                        }}</strong>
                    </article>
                </section>
            </header>

            <p v-if="pending" class="directory-empty">
                Loading proof directory...
            </p>

            <p v-else-if="visibleRuns.length === 0" class="directory-empty">
                No timestamped runs found in <code>output/</code>. Run
                <code>moon run workspace:run</code> and restart
                <code>moon run ui:dev</code>.
            </p>

            <section v-else class="directory-table">
                <header class="directory-row directory-row-head">
                    <span>Status</span>
                    <span>Circuit Name</span>
                    <span>Date</span>
                    <span>Network</span>
                    <span>Proof Hash</span>
                </header>

                <NuxtLink
                    v-for="run in visibleRuns"
                    :key="run.runId"
                    :to="`/proof/${run.runId}`"
                    class="directory-row directory-row-link"
                >
                    <StatusBadge :status="run.status" />
                    <span class="circuit-cell">
                        <span class="circuit-pill mono"
                            >employment-eligibility</span
                        >
                    </span>
                    <time class="date-cell">{{ run.runDate }}</time>
                    <span>{{ run.network }}</span>
                    <span class="mono hash-value">{{
                        truncateHash(run.proofHash)
                    }}</span>
                </NuxtLink>
            </section>
        </section>
    </main>
</template>
