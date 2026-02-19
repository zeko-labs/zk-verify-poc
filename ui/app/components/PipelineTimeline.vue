<script setup lang="ts">
interface TimelineItem {
  stage: string;
  description: string;
  time: string;
}

defineProps<{
  items: TimelineItem[];
}>();
</script>

<template>
  <ol class="timeline panel">
    <li v-for="item in items" :key="item.stage" class="timeline-item">
      <div class="timeline-time">{{ item.time }}</div>
      <div class="timeline-stage">{{ item.stage }}</div>
      <div class="timeline-description">{{ item.description }}</div>
    </li>
  </ol>
</template>
