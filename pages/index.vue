<template>
  <div class="landing-page gv-page">
    <PageHero crisp class="landing-page-hero w-full">
      <template #default>
        <div class="hero-title-container">
          <img src="/images/121px-Logo.jpg" alt="Gativus Logo" class="hero-logo">
          <div class="hero-text">
            <h1 class="hero-title gv-hero-gradient landing-brand-title">GATIVUS</h1>
            <p class="hero-subtitle">{{ t.heroTagline }}</p>
          </div>
        </div>
        <p class="hero-description mt-8">
          {{ t.heroDescription }}
        </p>
        <div class="hero-cta mt-10">
          <GvButton to="/books" color="sky" variant="solid" size="md" icon="i-heroicons-book-open">
            {{ t.articles }}
          </GvButton>
          <GvButton to="/about" variant="outline" color="gray" size="md" icon="i-heroicons-information-circle">
            {{ t.about }}
          </GvButton>
        </div>
      </template>
    </PageHero>

    <section class="pillars-section w-full" aria-label="Pillars">
      <article v-for="block in pillarBlocks" :key="block.badge" class="pillar-card">
        <div class="pillar-header">
          <span class="pillar-badge">{{ block.badge }}</span>
          <h2 class="pillar-name">{{ block.title }}</h2>
        </div>
        <div class="pillar-body">
          <p class="pillar-desc">{{ block.desc }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTagline: 'Theory of Mind · Network · Edge',
    heroDescription: 'Implementation of the transition from abstract theory of mind to network protocol and physical hardware.',
    articles: 'Books',
    about: 'About Project',
    metaTitle: 'Gativus — Home',
    metaDesc: 'Gativus — from theory of mind (GTOM) through network (GNET) to physical device (GATE). Official knowledge base.',
    pillars: [
      {
        badge: 'GTOM',
        title: 'Gativus Theory of Mind',
        desc:
          'GTOM treats consciousness as a dynamic superposition of levels — from spatial navigation to qualitative judgment — with a computable, hardware-realizable model.',
      },
      {
        badge: 'GNET',
        title: 'Gativus Network',
        desc:
          'Principles from GTOM inform a coherent distributed network over real infrastructure — unique IPv6 addressing and logical links between digital entities on GATE devices.',
      },
      {
        badge: 'GATE',
        title: 'Gativus Edge Device',
        desc:
          'GATE is the physical substrate: storage, execution, and protection of neural nodes, built for scaling on open-source foundations.',
      },
    ],
  },
  ru: {
    heroTagline: 'Теория сознания · Сеть · Устройство',
    heroDescription: 'Реализация перехода от абстрактной теории сознания к сетевому протоколу и физическому оборудованию.',
    articles: 'Книги',
    about: 'О проекте',
    metaTitle: 'Gativus — Главная',
    metaDesc: 'Gativus — от теории сознания (GTOM) через сеть (GNET) к физическому устройству (GATE). Официальная база знаний.',
    pillars: [
      {
        badge: 'GTOM',
        title: 'Gativus Theory of Mind',
        desc:
          'GTOM рассматривает сознание как динамическую суперпозицию уровней — от пространственной навигации до качественных суждений — в вычислимой модели, реализуемой аппаратно.',
      },
      {
        badge: 'GNET',
        title: 'Gativus Network',
        desc:
          'Идеи GTOM ложатся в основу когерентной распределённой сети на реальной инфраструктуре — уникальная адресация IPv6 и логические связи между сущностями на устройствах GATE.',
      },
      {
        badge: 'GATE',
        title: 'Gativus Edge Device',
        desc:
          'GATE — физический субстрат: хранение, исполнение и защита узлов нейросети, с упором на масштабирование и open-source базу.',
      },
    ],
  },
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const pillarBlocks = computed(() => t.value.pillars || uiDict.ru.pillars)

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


.landing-page-hero {
  min-height: min(72dvh, 640px);
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

.landing-brand-title {
  line-height: 1.08;
  letter-spacing: 0.34em !important;
}

@media (max-width: 768px) {
  .landing-brand-title {
    letter-spacing: 0.2em !important;
  }
}

.hero-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--gv-text-secondary);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 400;
}

.hero-cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
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