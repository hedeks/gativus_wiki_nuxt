<template>
  <div class="landing-page gv-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus Logo" class="hero-logo" />
        <div class="hero-text">
          <h1 class="hero-title gv-hero-gradient">GATIVUS</h1>
          <p class="hero-subtitle">Theory of Mind · Network · Edge</p>
        </div>
      </div>
      <p class="hero-description">
        {{ t.heroDescription }}
      </p>
      <div class="hero-cta">
        <GvButton to="/books" color="sky" variant="solid" size="md" icon="i-heroicons-book-open">
          {{ t.articles }}
        </GvButton>
        <GvButton to="/about" variant="outline" color="gray" size="md" icon="i-heroicons-information-circle">
          {{ t.about }}
        </GvButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroDescription: 'Implementation of the transition from abstract theory of mind to network protocol and physical hardware.',
    articles: 'Books',
    about: 'About Project',
    metaTitle: 'Gativus — Home',
    metaDesc: 'Gativus — from theory of mind (GTOM) through network (GNET) to physical device (GATE). Official knowledge base.'
  },
  ru: {
    heroDescription: 'Реализация перехода от абстрактной теории сознания к сетевому протоколу и физическому оборудованию.',
    articles: 'Книги',
    about: 'О проекте',
    metaTitle: 'Gativus — Главная',
    metaDesc: 'Gativus — от теории сознания (GTOM) через сеть (GNET) к физическому устройству (GATE). Официальная база знаний.'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

useSeoMeta({
  ogImage: '/favicon.ico',
  description: () => t.value.metaDesc,
  ogDescription: () => t.value.metaDesc,
  title: () => t.value.metaTitle,
})

useHead({
  htmlAttrs: { lang: () => langStore.currentLang },
  link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }]
})
</script>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 0 10px;
  max-width: 1100px;
  width: 100%;
}


/* ─── Hero ─── */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: calc(100dvh - var(--header-height, 65px));
  text-align: center;
  padding: 0;
  width: 100%;
}

.hero-title-container {
  display: flex;
  gap: 20px;
  align-items: center;
}

.hero-logo {
  height: 80px;
  width: auto;
  filter: drop-shadow(0 0 3px rgba(186, 186, 186, 0.6));
  border-radius: 8px;
}

.hero-text {
  display: flex;
  flex-direction: column;
}

.hero-title {
  margin: 0;
  font-size: 48px;
  line-height: 1.1;
  letter-spacing: 6px;
  font-weight: 700;
  color: #18181b;
  padding-bottom: 4px;
  user-select: none;
}

.dark .hero-title {
  color: #e5e5e5;
}

.hero-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: #777;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 400;
}

.dark .hero-subtitle {
  color: #999;
}

.hero-description {
  max-width: 640px;
  font-size: 17px;
  line-height: 1.7;
  color: #555;
  margin: 0;
}

.dark .hero-description {
  color: #aaa;
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 4px;
}

.cta-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
  cursor: pointer;
}

.cta-button.primary {
  background: #0284c7;
  color: #fff;
  border: 1px solid #0369a1;
}

.cta-button.primary:hover {
  background: #0369a1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
}

.dark .cta-button.primary {
  background: #0ea5e9;
  /* sky-500 */
  color: #fff;
  border-color: #0284c7;
}

.dark .cta-button.primary:hover {
  background: #38bdf8;
}

.cta-button.secondary {
  background: transparent;
  color: #555;
  border: 1px solid #c8c8c8;
}

.cta-button.secondary:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
}

.dark .cta-button.secondary {
  color: #aaa;
  border-color: #444;
}

.dark .cta-button.secondary:hover {
  background: #2a2a2a;
}

/* ─── Pillars ─── */
.pillars-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.pillar-card {
  width: 100%;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 0 1px 1px rgba(119, 119, 119, 0.1);
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.pillar-card:hover {
  box-shadow: 0 2px 12px rgba(119, 119, 119, 0.15);
}

.dark .pillar-card {
  background: #1a1a1a;
  border-color: #333;
  box-shadow: 0 0 1px 1px rgba(50, 50, 50, 0.3);
}

.dark .pillar-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.pillar-header {
  padding: 14px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #c8c8c8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dark .pillar-header {
  background-color: #222;
  border-bottom-color: #333;
}

.pillar-badge {
  background: linear-gradient(90deg, #e0f2fe, #bae6fd);
  /* sky-100 to 200 */
  color: #0c4a6e;
  /* sky-900 */
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
}

.dark .pillar-badge {
  background: linear-gradient(90deg, #075985, #0c4a6e);
  /* sky-800 to 900 */
  color: #e0f2fe;
}

.pillar-name {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.5px;
}

.dark .pillar-name {
  color: #ddd;
}

.pillar-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pillar-desc {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #444;
}

.dark .pillar-desc {
  color: #bbb;
}

/* Details */
.pillar-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.detail-item:hover {
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
  transform: translateY(-2px);
}

.dark .detail-item {
  background: #252525;
  border-color: #3a3a3a;
}

.dark .detail-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.detail-number {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #0284c7;
}

.dark .detail-number {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
  color: #bae6fd;
}

.detail-item strong {
  font-size: 14px;
  color: #333;
}

.dark .detail-item strong {
  color: #e0e0e0;
}

.detail-item p {
  margin: 3px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: #666;
}

.dark .detail-item p {
  color: #999;
}

.pillar-fact {
  margin: 0;
  padding: 12px 16px;
  border-left: 3px solid #bababa;
  font-size: 14px;
  line-height: 1.6;
  color: #555;
  font-style: italic;
  background: #fafafa;
  border-radius: 0 8px 8px 0;
}

.dark .pillar-fact {
  background: #252525;
  border-left-color: #555;
  color: #aaa;
}

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .hero-title-container {
    flex-direction: column;
  }

  .hero-title {
    font-size: 36px;
    letter-spacing: 5px;
  }

  .hero-logo {
    height: 60px;
  }

  .pillar-body {
    padding: 16px;
  }

  .landing-page {
    gap: 28px;
  }
}
</style>