<script setup lang="ts">
interface GridItem {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  href?: string;
  external?: boolean;
}

defineProps<{
  items: GridItem[];
}>();
</script>

<template>
  <dl class="kv-grid panel">
    <template v-for="item in items" :key="item.label">
      <dt class="kv-label">{{ item.label }}</dt>
      <dd class="kv-value" :class="{ mono: item.mono, highlight: item.highlight }">
        <a
          v-if="item.href"
          :href="item.href"
          :target="item.external ? '_blank' : undefined"
          :rel="item.external ? 'noreferrer' : undefined"
          class="kv-link"
        >
          {{ item.value }}
        </a>
        <span v-else>{{ item.value }}</span>
      </dd>
    </template>
  </dl>
</template>
