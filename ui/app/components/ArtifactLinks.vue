<script setup lang="ts">
interface ArtifactEntry {
  fileName: string;
  href: string;
  available: boolean;
}

defineProps<{
  items: ArtifactEntry[];
}>();
</script>

<template>
  <ul class="artifact-list panel">
    <li v-for="item in items" :key="item.fileName" class="artifact-item">
      <a v-if="item.available" :href="item.href" target="_blank" rel="noreferrer" class="artifact-link">
        {{ item.fileName }}
      </a>
      <span v-else class="artifact-missing">{{ item.fileName }} (not found)</span>
    </li>
  </ul>
</template>
