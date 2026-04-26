<template>
  <div class="about-page gv-page">
    <!-- Hero -->
    <section class="about-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus Logo" class="hero-logo" />
        <div class="hero-text">
          <h1 class="hero-title gv-hero-gradient uppercase">{{ t.heroTitle }}</h1>
          <p class="hero-subtitle">{{ t.heroSubtitle }}</p>
        </div>
      </div>
      <p class="hero-description">
        {{ t.heroDescription }}
      </p>
    </section>

    <!-- GTOM -->
    <section class="section-card">
      <div class="card-header">
        <span class="card-badge">GTOM</span>
        <h2 class="card-header-title">Gativus Theory of Mind</h2>
      </div>
      <div class="card-body">
        <p>
          {{ t.gtomBrief }}
        </p>
        <div class="levels-grid">
          <div v-for="level in localizedGtomLevels" :key="level.title" class="level-card">
            <div class="level-icon-wrapper">
              <span class="level-number">{{ level.num }}</span>
            </div>
            <div class="level-info">
              <h3 class="level-title">{{ level.title }}</h3>
              <p class="level-desc">{{ level.description }}</p>
            </div>
          </div>
        </div>
        <blockquote class="info-quote">
          {{ t.gtomQuote }}
        </blockquote>
      </div>
    </section>

    <!-- GNET -->
    <section class="section-card">
      <div class="card-header">
        <span class="card-badge">GNET</span>
        <h2 class="card-header-title">Gativus Network</h2>
      </div>
      <div class="card-body">
        <p>
          {{ t.gnetBrief }}
        </p>
        <div class="net-grid">
          <div class="net-concept">
            <div class="net-icon">
              <UIcon name="i-heroicons-circle-stack" class="net-icon-svg" />
            </div>
            <h3>Nodes</h3>
            <p>{{ t.gnetNodes }}</p>
          </div>
          <div class="net-concept">
            <div class="net-icon">
              <UIcon name="i-heroicons-arrow-path-rounded-square" class="net-icon-svg" />
            </div>
            <h3>Virtual Links</h3>
            <p>{{ t.gnetLinks }}</p>
          </div>
        </div>
        <blockquote class="info-quote">
          {{ t.gnetQuote }}
        </blockquote>
      </div>
    </section>

    <!-- GATE -->
    <section class="section-card">
      <div class="card-header">
        <span class="card-badge">GATE</span>
        <h2 class="card-header-title">Gativus Edge Device</h2>
      </div>
      <div class="card-body">
        <p>
          {{ t.gateBrief }}
        </p>
        <div class="gate-stats">
          <div class="stat-item">
            <span class="stat-value">10⁹</span>
            <span class="stat-label">{{ t.gateNeurons }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">IPv6</span>
            <span class="stat-label">{{ t.gateIpv6 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">OSS</span>
            <span class="stat-label">{{ t.gateOss }}</span>
          </div>
        </div>
        <blockquote class="info-quote">
          {{ t.gateQuote }}
        </blockquote>
      </div>
    </section>

    <!-- NDDI -->
    <section class="section-card">
      <div class="card-header">
        <h2 class="card-header-title">{{ t.nddiTitle }}</h2>
      </div>
      <div class="card-body">
        <p>
          {{ t.nddiBrief }}
        </p>
        <div class="nddi-tags">
          <div v-for="section in localizedNddiSections" :key="section.letter" class="nddi-tag">
            <span class="nddi-letter">{{ section.letter }}</span>
            <span class="nddi-label">{{ section.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section-card cta-card">
      <div class="card-body cta-body">
        <h2 class="cta-title">{{ t.ctaTitle }}</h2>
        <p class="cta-text">
          {{ t.ctaText }}
        </p>
        <div class="cta-buttons">
          <NuxtLink to="/books" class="cta-button primary">
            <UIcon name="i-heroicons-book-open" />
            {{ t.ctaArticles }}
          </NuxtLink>
          <a href="mailto:gativusmedia@outlook.com" class="cta-button secondary">
            <UIcon name="i-heroicons-envelope" />
            gativusmedia@outlook.com
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const langStore = useLanguageStore()

const uiDict: Record<string, any> = {
  en: {
    heroTitle: 'ABOUT PROJECT',
    heroSubtitle: 'Gativus — Knowledge Base',
    heroDescription: 'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
    gtomBrief: 'GTOM considers the phenomenon of consciousness not as a monolithic structure, but as a dynamic superposition of three independent levels (components).',
    gtomQuote: 'Consciousness is modeled as a hyper-map of 11 layers of elementary maps — from sensory inputs to quality processing structures. The theory strictly states that full consciousness has a technical, computable nature and can be fully realized in hardware.',
    gnetBrief: 'GTOM principles are used to design a physical distributed network based on existing technologies and infrastructure, giving them a new logic of coherence.',
    gnetNodes: 'Digital network entities hosted on specialized edge devices (GATE)',
    gnetLinks: 'Synaptic connections via global Internet routing on IPv6 base',
    gnetQuote: 'The basis of GNET is the existing IPv6 infrastructure, providing unique global addressing with protocol extensions without breaking current RFC standards.',
    gateBrief: 'GATE is a physical device for storing, executing, and protecting neural network nodes. Built on modern computer architectures with horizontal scaling capability.',
    gateNeurons: 'artificial neurons per device',
    gateIpv6: 'global addressing for each node',
    gateOss: 'exclusively open-source base',
    gateQuote: 'The practical implementation of GATE strictly relies on open-source operating systems, providing Qualitative Consciousness (GTOM) with a reliable physical substrate for continuous operation.',
    nddiTitle: 'NDDI — Network Digital Domain Instance',
    nddiBrief: 'The entire network is built from unified NDDIs — addressable instances existing within the Gativus domain. Each NDDI has a globally unique name (UNON) in IPv6 space. Internal NDDI components are grouped into 6 functional types:',
    ctaTitle: 'Start Exploring',
    ctaText: 'Explore Gativus articles to dive deep into the full theory and project specifications.',
    ctaArticles: 'Gativus Books',
    metaTitle: 'About — Gativus',
    metaDesc: 'GTOM · GNET · GATE — from theory of mind to physical device. Full Gativus project architecture.'
  },
  ru: {
    heroTitle: 'О ПРОЕКТЕ',
    heroSubtitle: 'Gativus — база знаний',
    heroDescription: 'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, реализующих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
    gtomBrief: 'GTOM рассматривает феномен сознания не как монолитную структуру, а как динамическую суперпозицию трёх независимых уровней (компонентов).',
    gtomQuote: 'Сознание моделируется как гипер-карта из 11 слоёв элементарных карт — от сенсорных входов до структур обработки качеств. Теория строго утверждает, что полное сознание имеет техническую, вычислимую природу и может быть полностью реализовано аппаратно.',
    gnetBrief: 'Принципы GTOM используются для проектирования физической распределённой сети на основе существующих технологий и инфраструктуры, придавая им новую логику когерентности.',
    gnetNodes: 'Цифровые сетевые сущности, размещённые на специализированных периферийных устройствах (GATE)',
    gnetLinks: 'Синаптические соединения через глобальную маршрутизацию Интернета на базе IPv6',
    gnetQuote: 'Основа GNET — существующая инфраструктура IPv6, обеспечивающая уникальную глобальную адресацию с расширениями протокола без нарушения текущих стандартов RFC.',
    gateBrief: 'GATE — физическое устройство для хранения, исполнения и защиты узлов нейронной сети. Построено на современных компьютерных архитектурах с возможностью горизонтального масштабирования.',
    gateNeurons: 'искусственных нейронов на одно устройство',
    gateIpv6: 'глобальная адресация каждого узла',
    gateOss: 'исключительно open-source основа',
    gateQuote: 'Практическая реализация GATE строго опирается на операционные системы с открытым исходным кодом, предоставляя Qualitative Consciousness (GTOM) надёжный физический субстрат для непрерывной работы.',
    nddiTitle: 'NDDI — Network Digital Domain Instance',
    nddiBrief: 'Вся сеть построена из унифицированных NDDI — адресуемых экземпляров, существующих в рамках домена Gativus. Каждый NDDI обладает глобально уникальным именем (UNON) в пространстве IPv6. Внутренние компоненты NDDI группируются в 6 функциональных типов:',
    ctaTitle: 'Начните изучение',
    ctaText: 'Перейдите к статьям Gativus, чтобы погрузиться в полную теорию и спецификации проекта.',
    ctaArticles: 'Книги Gativus',
    metaTitle: 'О проекте — Gativus',
    metaDesc: 'GTOM · GNET · GATE — от теории сознания к физическому устройству. Полная архитектура проекта Gativus.'
  }
}

const t = computed(() => uiDict[langStore.currentLang] || uiDict.ru)

const localizedGtomLevels = computed(() => {
  if (langStore.currentLang === 'en') {
    return [
      {
        num: '1',
        title: 'Spatial Consciousness',
        description: 'Navigation and orientation in 3D space. The system works with genetically predefined goals and builds topological routes to achieve them.'
      },
      {
        num: '2',
        title: 'Symbolic Consciousness',
        description: 'Interaction in multidimensional space of concepts. Each concept has its vector and symbol. LLMs/GPTs mimic this layer, but symbol manipulation is insufficient for subjectivity.'
      },
      {
        num: '3',
        title: 'Qualitative Consciousness',
        description: 'Formation of complex target concepts — "beauty", "correctness", "honor". The Hegelian Aufheben operator turns the system from a calculator into a Subject with intention for self-improvement.'
      }
    ]
  }
  return [
    {
      num: '1',
      title: 'Spatial Consciousness',
      description: 'Навигация и ориентация в 3D-пространстве. Система работает с генетически предопределёнными целями и строит топологические маршруты для их достижения.'
    },
    {
      num: '2',
      title: 'Symbolic Consciousness',
      description: 'Взаимодействие в многомерном пространстве концептов. Каждый концепт имеет свой вектор и символ. LLM/GPT имитируют этот слой, но манипуляция символами недостаточна для субъективности.'
    },
    {
      num: '3',
      title: 'Qualitative Consciousness',
      description: 'Формирование сложных целевых концептов — «красота», «правильность», «честь». Оператор Гегелевского Aufheben превращает систему из калькулятора в Субъект с интенцией к самосовершенствованию.'
    }
  ]
})

const localizedNddiSections = computed(() => {
  if (langStore.currentLang === 'en') {
    return [
      { letter: 'V', label: 'Information Values — values in addressable containers' },
      { letter: 'B', label: 'Autonomous Behavior — internal NDDI response' },
      { letter: 'S', label: 'Structure — skeletal information for replication' },
      { letter: 'G', label: 'Security Management — rules and security' },
      { letter: 'T', label: 'Target Management — external NDDI response' },
      { letter: 'A', label: 'Aggregation — data aggregation' }
    ]
  }
  return [
    { letter: 'V', label: 'Information Values — значения в адресуемых контейнерах' },
    { letter: 'B', label: 'Autonomous Behavior — внутренний отклик NDDI' },
    { letter: 'S', label: 'Structure — скелетная информация для репликации' },
    { letter: 'G', label: 'Security Management — правила и безопасность' },
    { letter: 'T', label: 'Target Management — внешний отклик NDDI' },
    { letter: 'A', label: 'Aggregation — агрегация данных' }
  ]
})

useSeoMeta({
  title: () => t.value.metaTitle,
  description: () => t.value.metaDesc,
  ogDescription: () => t.value.metaDesc,
  ogImage: '/images/121px-Logo.jpg',
})

definePageMeta({ layout: 'default' })
</script>

<style scoped>
.about-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 10px 60px;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

/* ─── Hero ─── */
.about-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  min-height: calc(40vh - var(--header-height, 64px));
  text-align: center;
  padding: 10px 20px 10px;
  width: 100%;
}

.hero-title-container {
  display: flex;
  gap: 20px;
  align-items: center;
}

.hero-title {
  margin: 0;
  font-size: 48px;
  line-height: 1.1;
  letter-spacing: 6px;
  font-weight: 700;
  color: #18181b;
  padding-bottom: 8px;
  user-select: none;
}

.hero-logo {
  height: 72px;
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
  font-size: 42px;
  line-height: 1;
  letter-spacing: 6px;
  font-weight: 700;
  color: #333;
  border-bottom: 1px solid #bababa;
  padding-bottom: 8px;
  filter: none;
}

.dark .hero-title {
  color: #e5e5e5;
  border-bottom-color: #555;
}

.hero-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: #777;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

.dark .hero-subtitle {
  color: #999;
}

.hero-description {
  max-width: 680px;
  font-size: 16px;
  line-height: 1.7;
  color: #555;
  margin: 0;
}

.dark .hero-description {
  color: #aaa;
}

/* ─── Section Card ─── */
.section-card {
  width: 100%;
  border: 1px solid #c8c8c8;
  border-radius: 15px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  transition: box-shadow 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.section-card:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
}

.dark .section-card {
  background: #1a1a1a;
  border-color: #333;
}

.dark .section-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
}

.card-header {
  padding: 14px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #c8c8c8;
  display: flex;
  align-items: center;
  gap: 12px;
}

.dark .card-header {
  background-color: #222;
  border-bottom-color: #333;
}

.card-badge {
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

.dark .card-badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  /* sky-900 to 950 */
  color: #e0f2fe;
}

.card-header-title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.5px;
}

.dark .card-header-title {
  color: #ddd;
}

.card-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card-body>p {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #444;
}

.dark .card-body>p {
  color: #bbb;
}

/* ─── GTOM Levels ─── */
.levels-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.level-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  background: #fff;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.level-card:hover {
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
  transform: translateY(-2px);
}

.dark .level-card {
  background: #252525;
  border-color: #3a3a3a;
}

.dark .level-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.level-icon-wrapper {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .level-icon-wrapper {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
}

.level-number {
  font-weight: 700;
  font-size: 16px;
  color: #0284c7;
}

.dark .level-number {
  color: #bae6fd;
}

.level-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.level-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.dark .level-title {
  color: #e0e0e0;
}

.level-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: #666;
}

.dark .level-desc {
  color: #999;
}

/* ─── GNET Grid ─── */
.net-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

@media (max-width: 640px) {
  .net-grid {
    grid-template-columns: 1fr;
  }
}

.net-concept {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.net-concept:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
}

.dark .net-concept {
  background: #252525;
  border-color: #3a3a3a;
}

.net-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e0f2fe, #bae6fd);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dark .net-icon {
  background: linear-gradient(135deg, #0c4a6e, #082f49);
}

.net-icon-svg {
  width: 22px;
  height: 22px;
  color: #555;
}

.dark .net-icon-svg {
  color: #ccc;
}

.net-concept h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dark .net-concept h3 {
  color: #e0e0e0;
}

.net-concept p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: #666;
}

.dark .net-concept p {
  color: #999;
}

/* ─── GATE Stats ─── */
.gate-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

@media (max-width: 640px) {
  .gate-stats {
    grid-template-columns: 1fr;
  }
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 12px;
  border: 1px solid #e9e9e9;
  border-radius: 12px;
  text-align: center;
  background: #fafafa;
  transition: all 0.3s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(34, 60, 80, 0.12);
}

.dark .stat-item {
  background: #252525;
  border-color: #3a3a3a;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  letter-spacing: 1px;
}

.dark .stat-value {
  color: #e0e0e0;
}

.stat-label {
  font-size: 12px;
  line-height: 1.4;
  color: #666;
}

.dark .stat-label {
  color: #999;
}

/* ─── NDDI Tags ─── */
.nddi-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.nddi-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border: 1px solid #ececec;
  border-radius: 8px;
  background: #fff;
  font-size: 13px;
  color: #555;
  transition: all 0.2s ease;
}

.nddi-tag:hover {
  background: #f5f5f5;
}

.dark .nddi-tag {
  background: #2a2a2a;
  border-color: #3a3a3a;
  color: #aaa;
}

.dark .nddi-tag:hover {
  background: #333;
}

.nddi-letter {
  font-weight: 700;
  font-size: 15px;
  color: #333;
  width: 20px;
  text-align: center;
}

.dark .nddi-letter {
  color: #e0e0e0;
}

/* ─── Blockquote ─── */
.info-quote {
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

.dark .info-quote {
  background: #252525;
  border-left-color: #555;
  color: #aaa;
}

/* ─── CTA ─── */
.cta-card {
  border-color: #bababa;
}

.dark .cta-card {
  border-color: #444;
}

.cta-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 40px 24px;
}

.cta-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
  letter-spacing: 1px;
}

.dark .cta-title {
  color: #e0e0e0;
}

.cta-text {
  margin: 0;
  max-width: 520px;
  font-size: 15px;
  line-height: 1.7;
  color: #555;
}

.dark .cta-text {
  color: #aaa;
}

.cta-buttons {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
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
  background: #0c4a6e;
  /* sky-900 */
  color: #fff;
  border: 1px solid #075985;
}

.cta-button.primary:hover {
  background: #0369a1;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(12, 74, 110, 0.2);
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

/* ─── Responsive ─── */
@media (max-width: 640px) {
  .hero-title-container {
    flex-direction: column;
  }

  .hero-title {
    font-size: 32px;
    letter-spacing: 4px;
  }

  .hero-logo {
    height: 56px;
  }

  .card-body {
    padding: 16px;
  }

  .about-page {
    gap: 20px;
  }
}

.dark .hero-title {
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0ea5e9, #7dd3fc);
  background-size: 300% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>