<template>
  <div class="placeholder-page">
    <div class="placeholder-card">
      <div class="placeholder-icon-wrap">
        <UIcon name="i-heroicons-book-open" class="placeholder-icon" />
      </div>
      <h1 class="placeholder-title">Книги Gativus</h1>
      <p class="placeholder-desc">
        Полные тексты книг проекта Gativus — GTOM, GNET, GATE. Импортированные из ODT с интерактивными терминами.
      </p>
      <div class="placeholder-badge">
        <UIcon name="i-heroicons-wrench-screwdriver" />
        В разработке — Фаза 2
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Книги — Gativus Wiki',
  description: 'Библиотека книг проекта Gativus — GTOM, GNET, GATE.',
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
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .placeholder-icon-wrap {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
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

.dark .placeholder-title {
  color: #e5e5e5;
}

.placeholder-desc {
  font-size: 15px;
  line-height: 1.6;
  color: #666;
  margin: 0;
}

.dark .placeholder-desc {
  color: #999;
}

.placeholder-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 24px;
  border-radius: 12px;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 13px;
  font-weight: 700;
  margin-top: 16px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.dark .placeholder-badge {
  background: #0c4a6e;
  color: #7dd3fc;
}

</style>
