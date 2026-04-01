<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus Logo" class="hero-logo" />
        <div class="hero-text">
          <h1 class="hero-title">GATIVUS</h1>
          <p class="hero-subtitle">Theory of Mind · Network · Edge</p>
        </div>
      </div>
      <p class="hero-description">
        Реализация перехода от абстрактной теории сознания к сетевому протоколу и физическому оборудованию
      </p>
      <div class="hero-cta">
        <NuxtLink to="/courses" class="cta-button primary">
          <UIcon name="i-heroicons-book-open" />
          Книги Gativus
        </NuxtLink>
        <NuxtLink to="/about" class="cta-button secondary">
          <UIcon name="i-heroicons-information-circle" />
          О проекте
        </NuxtLink>
      </div>
    </section>

    <!-- Three Pillars -->
    <section class="pillars-section">
      <div 
        v-for="pillar in pillars" 
        :key="pillar.abbr" 
        class="pillar-card"
        @mouseenter="hoveredPillar = pillar.abbr"
        @mouseleave="hoveredPillar = null"
      >
        <div class="pillar-header">
          <span class="pillar-badge">{{ pillar.abbr }}</span>
          <h2 class="pillar-name">{{ pillar.name }}</h2>
        </div>
        <div class="pillar-body">
          <p class="pillar-desc">{{ pillar.description }}</p>
          <div v-if="pillar.details" class="pillar-details">
            <div v-for="(detail, i) in pillar.details" :key="i" class="detail-item">
              <span class="detail-number">{{ i + 1 }}</span>
              <div>
                <strong>{{ detail.title }}</strong>
                <p>{{ detail.text }}</p>
              </div>
            </div>
          </div>
          <p v-if="pillar.fact" class="pillar-fact">{{ pillar.fact }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const hoveredPillar = ref<string | null>(null)

const pillars = [
  {
    abbr: 'GTOM',
    name: 'Gativus Theory of Mind',
    description: 'Фундаментальная теория, определяющая архитектуру и механику сознания. Сознание моделируется как динамическая суперпозиция трёх независимых уровней:',
    details: [
      {
        title: 'Spatial Consciousness',
        text: 'Навигация и ориентация в 3D-пространстве. Система работает с генетически предопределёнными целями и строит топологические маршруты.'
      },
      {
        title: 'Symbolic Consciousness',
        text: 'Взаимодействие в пространстве концептов. Каждый концепт имеет свой вектор и символ. LLM/GPT имитируют этот слой, но одних символов недостаточно для субъективности.'
      },
      {
        title: 'Qualitative Consciousness',
        text: 'Формирование сложных целевых концептов — «красота», «правильность», «честь». Оператор Гегелевского Aufheben превращает систему из калькулятора в Субъект.'
      }
    ],
    fact: 'Гипер-карта из 11 слоёв элементарных карт — от сенсорных входов до структур обработки качеств.'
  },
  {
    abbr: 'GNET',
    name: 'Gativus Network',
    description: 'Спецификация сетевой топологии, описывающая физическую структуру сети в строгом соответствии с принципами GTOM.',
    details: [
      {
        title: 'Nodes',
        text: 'Цифровые сетевые сущности, размещённые на специализированных периферийных устройствах (GATE).'
      },
      {
        title: 'Virtual Links (Synapses)',
        text: 'Соединения, реализуемые через глобальную маршрутизацию Интернета на основе IPv6 без нарушения стандартов RFC.'
      }
    ],
    fact: 'Каждая сущность — гибкий контейнер функций, моделирующий нейроны, кортикальные колонки и сложные иерархические группы.'
  },
  {
    abbr: 'GATE',
    name: 'Gativus Edge Device',
    description: 'Физическое устройство для хранения, исполнения и защиты узлов нейронной сети. Построено на современных компьютерных архитектурах с горизонтальным масштабированием.',
    details: null,
    fact: 'Одно устройство GATE способно вместить до одного миллиарда искусственных нейронов. Реализация основана исключительно на open-source операционных системах.'
  }
]

useSeoMeta({
  ogImage: '/images/121px-Logo.jpg',
  description: 'Gativus — от теории сознания (GTOM) через сеть (GNET) к физическому устройству (GATE). Официальная база знаний.',
  ogDescription: 'Gativus — от теории сознания к физическому устройству. Официальная база знаний.',
  title: 'Gativus Wiki — Главная',
})
useHead({
  htmlAttrs: { lang: 'ru' },
  link: [{ rel: 'icon', type: 'image/svg', href: '/logo.svg' }]
})
</script>

<style scoped>
.landing-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 40px;
  padding: 0 10px 60px;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
}

/* ─── Hero ─── */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  min-height: calc(80vh - var(--header-height, 64px));
  text-align: center;
  padding: 40px 20px 0;
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
  font-size: 56px;
  line-height: 1;
  letter-spacing: 8px;
  font-weight: 700;
  color: #333;
  border-bottom: 1px solid #bababa;
  padding-bottom: 8px;
  filter: drop-shadow(0 0 2px #bababa);
}
.dark .hero-title { color: #e5e5e5; border-bottom-color: #555; }
.hero-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: #777;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 400;
}
.dark .hero-subtitle { color: #999; }
.hero-description {
  max-width: 640px;
  font-size: 17px;
  line-height: 1.7;
  color: #555;
  margin: 0;
}
.dark .hero-description { color: #aaa; }
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
  background: #454545;
  color: #fff;
  border: 1px solid #333;
}
.cta-button.primary:hover {
  background: #333;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}
.dark .cta-button.primary {
  background: #e0e0e0;
  color: #1a1a1a;
  border-color: #ccc;
}
.dark .cta-button.primary:hover { background: #fff; }
.cta-button.secondary {
  background: transparent;
  color: #555;
  border: 1px solid #c8c8c8;
}
.cta-button.secondary:hover {
  background: #f5f5f5;
  transform: translateY(-1px);
}
.dark .cta-button.secondary { color: #aaa; border-color: #444; }
.dark .cta-button.secondary:hover { background: #2a2a2a; }

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
.dark .pillar-header { background-color: #222; border-bottom-color: #333; }
.pillar-badge {
  background: linear-gradient(90deg, #ededed, #ddd);
  color: #333;
  padding: 4px 12px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
}
.dark .pillar-badge {
  background: linear-gradient(90deg, #3a3a3a, #444);
  color: #e0e0e0;
}
.pillar-name {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.5px;
}
.dark .pillar-name { color: #ddd; }
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
.dark .pillar-desc { color: #bbb; }

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
.dark .detail-item { background: #252525; border-color: #3a3a3a; }
.dark .detail-item:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
.detail-number {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #ededed, #d5d5d5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  color: #454545;
}
.dark .detail-number {
  background: linear-gradient(135deg, #3a3a3a, #4a4a4a);
  color: #ddd;
}
.detail-item strong {
  font-size: 14px;
  color: #333;
}
.dark .detail-item strong { color: #e0e0e0; }
.detail-item p {
  margin: 3px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: #666;
}
.dark .detail-item p { color: #999; }

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
  .hero-title-container { flex-direction: column; }
  .hero-title { font-size: 36px; letter-spacing: 5px; }
  .hero-logo { height: 60px; }
  .pillar-body { padding: 16px; }
  .landing-page { gap: 28px; }
}
</style>