<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <div class="placeholder-icon-wrap">
        <UIcon name="i-heroicons-share" class="placeholder-icon" />
      </div>
      <h1 class="placeholder-title">Граф знаний</h1>
      <p class="placeholder-desc">
        Интерактивный force-directed граф на D3.js — визуализация связей между терминами, категориями и статьями Gativus.
      </p>
      <div class="placeholder-badge">
        <UIcon name="i-heroicons-wrench-screwdriver" />
        В разработке — Фаза 4
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Граф знаний — Gativus Wiki',
  description: 'Интерактивный граф знаний Gativus — визуализация связей между терминами и категориями.',
})
</script>

<style scoped>
.placeholder-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(70vh - var(--header-height, 64px));
  padding: 40px 20px;
}
.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  max-width: 440px;
}
.placeholder-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, #f0f0f2, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dark .placeholder-icon-wrap {
  background: linear-gradient(135deg, #2a2a2e, #333);
}
.placeholder-icon {
  width: 36px;
  height: 36px;
  color: #0284c7;
}
.placeholder-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
}
.dark .placeholder-title { color: #e5e5e5; }
.placeholder-desc {
  font-size: 15px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}
.dark .placeholder-desc { color: #999; }
.placeholder-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 10px;
  background: #e0f2fe;
  color: #0c4a6e;
  font-size: 13px;
  font-weight: 600;
  margin-top: 8px;
}
.dark .placeholder-badge {
  background: #082f49;
  color: #bae6fd;
}
</style>
