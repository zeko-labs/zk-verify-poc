<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "verified" | "failed" | "unknown";
}>();

const label = computed(() => {
  if (props.status === "verified") {
    return "Verified";
  }

  if (props.status === "failed") {
    return "Failed";
  }

  return "Unknown";
});
</script>

<template>
  <span class="status-badge" :class="`status-${status}`">
    <span class="status-dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>
