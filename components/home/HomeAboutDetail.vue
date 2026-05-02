<template>
  <div id="about-detail" class="home-about">
    <div class="home-header-group">
      <p v-if="t.detailKicker" class="home-kicker">{{ t.detailKicker }}</p>
      <h2 v-if="t.detailTitle" class="home-h2">{{ t.detailTitle }}</h2>
      <p v-if="t.detailIntro" class="home-about-intro">{{ t.detailIntro }}</p>
    </div>

    <!-- GTOM -->
    <article id="about-gtom" class="gv-surface-card scroll-target">
      <header class="gv-card-header">
        <span class="home-about-badge">GTOM</span>
        <h3 class="home-about-card-title">Gativus Theory of Mind</h3>
      </header>
      <div class="home-about-card-body">
        <p class="home-about-p">{{ t.gtomBrief }}</p>
        <div class="home-about-levels">
          <div
            v-for="level in gtomLevels"
            :key="level.title"
            class="home-about-level gv-focusable"
          >
            <div class="home-about-level-num" aria-hidden="true">{{ level.num }}</div>
            <div class="home-about-level-info">
              <h4 class="home-about-level-title">{{ level.title }}</h4>
              <p class="home-about-level-desc">{{ level.description }}</p>
            </div>
          </div>
        </div>
        <blockquote class="home-about-quote">{{ t.gtomQuote }}</blockquote>
      </div>
    </article>

    <!-- GNET -->
    <article id="about-gnet" class="gv-surface-card scroll-target">
      <header class="gv-card-header">
        <span class="home-about-badge">GNET</span>
        <h3 class="home-about-card-title">Gativus Network</h3>
      </header>
      <div class="home-about-card-body">
        <p class="home-about-p">{{ t.gnetBrief }}</p>
        <div class="home-about-net">
          <div class="home-about-net-item gv-focusable">
            <div class="home-about-net-ic" aria-hidden="true">
              <UIcon name="i-heroicons-circle-stack" class="size-7" />
            </div>
            <h4 class="home-about-net-h">{{ t.gnetNodesTitle }}</h4>
            <p class="home-about-net-p">{{ t.gnetNodes }}</p>
          </div>
          <div class="home-about-net-item gv-focusable">
            <div class="home-about-net-ic" aria-hidden="true">
              <UIcon name="i-heroicons-arrow-path-rounded-square" class="size-7" />
            </div>
            <h4 class="home-about-net-h">{{ t.gnetLinksTitle }}</h4>
            <p class="home-about-net-p">{{ t.gnetLinks }}</p>
          </div>
        </div>
        <blockquote class="home-about-quote">{{ t.gnetQuote }}</blockquote>
      </div>
    </article>

    <!-- GATE -->
    <article id="about-gate" class="gv-surface-card scroll-target">
      <header class="gv-card-header">
        <span class="home-about-badge">GATE</span>
        <h3 class="home-about-card-title">Gativus Edge Device</h3>
      </header>
      <div class="home-about-card-body">
        <p class="home-about-p">{{ t.gateBrief }}</p>
        <div class="home-about-stats">
          <div class="home-about-stat gv-focusable">
            <span class="home-about-stat-val">10⁹</span>
            <span class="home-about-stat-lbl">{{ t.gateNeurons }}</span>
          </div>
          <div class="home-about-stat gv-focusable">
            <span class="home-about-stat-val">IPv6</span>
            <span class="home-about-stat-lbl">{{ t.gateIpv6 }}</span>
          </div>
          <div class="home-about-stat gv-focusable">
            <span class="home-about-stat-val">OSS</span>
            <span class="home-about-stat-lbl">{{ t.gateOss }}</span>
          </div>
        </div>
        <blockquote class="home-about-quote">{{ t.gateQuote }}</blockquote>
      </div>
    </article>

    <!-- NDDI -->
    <article id="about-nddi" class="gv-surface-card scroll-target">
      <header class="gv-card-header">
        <h3 class="home-about-card-title">{{ t.nddiTitle }}</h3>
      </header>
      <div class="home-about-card-body">
        <p class="home-about-p">{{ t.nddiBrief }}</p>
        <div class="home-about-tags">
          <div
            v-for="section in nddiSections"
            :key="section.letter"
            class="home-about-tag"
          >
            <span class="home-about-tag-letter">{{ section.letter }}</span>
            <span class="home-about-tag-lbl">{{ section.label }}</span>
          </div>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'
import type { LandingBlockResolved } from '~/types/landing'

const props = defineProps<{
  block?: LandingBlockResolved
}>()

const langStore = useLanguageStore()

type Lang = 'en' | 'ru' | 'zh'

// Helper to pick localized string from payload object
function pickPayload(obj: any, key: string, lang: string): string {
  if (!obj) return ''
  if (lang === 'ru') return obj[`${key}_ru`] || obj[key] || ''
  if (lang === 'zh') return obj[`${key}_zh`] || obj[key] || ''
  return obj[key] || ''
}

// Fallback hardcoded strings
const fallback = computed(() => {
  const code = langStore.currentLang as Lang
  return uiDict[code] ?? uiDict.en
})

const t = computed(() => {
  const p = props.block?.payload
  const l = langStore.currentLang
  
  return {
    detailKicker: props.block?.kicker || fallback.value.detailKicker,
    detailTitle: props.block?.title || fallback.value.detailTitle,
    detailIntro: props.block?.subtitle || props.block?.body || fallback.value.detailIntro,
    
    gtomBrief: pickPayload(p?.gtom, 'brief', l) || fallback.value.gtomBrief,
    gtomQuote: pickPayload(p?.gtom, 'quote', l) || fallback.value.gtomQuote,
    
    gnetBrief: pickPayload(p?.gnet, 'brief', l) || fallback.value.gnetBrief,
    gnetNodesTitle: pickPayload(p?.gnet, 'nodes_title', l) || fallback.value.gnetNodesTitle,
    gnetLinksTitle: pickPayload(p?.gnet, 'links_title', l) || fallback.value.gnetLinksTitle,
    gnetNodes: pickPayload(p?.gnet, 'nodes_desc', l) || fallback.value.gnetNodes,
    gnetLinks: pickPayload(p?.gnet, 'links_desc', l) || fallback.value.gnetLinks,
    gnetQuote: pickPayload(p?.gnet, 'quote', l) || fallback.value.gnetQuote,
    
    gateBrief: pickPayload(p?.gate, 'brief', l) || fallback.value.gateBrief,
    gateNeurons: pickPayload(p?.gate, 'neurons_val', l) || fallback.value.gateNeurons,
    gateIpv6: pickPayload(p?.gate, 'ipv6_val', l) || fallback.value.gateIpv6,
    gateOss: pickPayload(p?.gate, 'oss_val', l) || fallback.value.gateOss,
    gateQuote: pickPayload(p?.gate, 'quote', l) || fallback.value.gateQuote,
    
    nddiTitle: pickPayload(p?.nddi, 'title', l) || fallback.value.nddiTitle,
    nddiBrief: pickPayload(p?.nddi, 'brief', l) || fallback.value.nddiBrief,
  }
})

const gtomLevels = computed(() => {
  const p = props.block?.payload?.gtom
  const l = langStore.currentLang
  
  if (Array.isArray(p?.levels) && p.levels.length > 0) {
    return p.levels.map((lvl: any, idx: number) => ({
      num: lvl.num || (idx + 1).toString(),
      title: pickPayload(lvl, 'title', l),
      description: pickPayload(lvl, 'desc', l)
    }))
  }
  
  if (l === 'ru') {
    return [
      { num: '1', title: 'Spatial Consciousness', description: 'Навигация и ориентация в 3D-пространстве. Система работает с генетически предопределёнными целями и строит топологические маршруты для их достижения.' },
      { num: '2', title: 'Symbolic Consciousness', description: 'Взаимодействие в многомерном пространстве концептов. Каждый концепт имеет свой вектор и символ. LLM/GPT имитируют этот слой, но манипуляция символами недостаточна для субъективности.' },
      { num: '3', title: 'Qualitative Consciousness', description: 'Формирование сложных целевых концептов — «красота», «правильность», «честь». Оператор Гегелевского Aufheben превращает систему из калькулятора в Субъект с интенцией к самосовершенствованию.' }
    ]
  }
  if (l === 'zh') {
    return [
      { num: '1', title: 'Spatial Consciousness', description: '在三维空间中的导航与定向。系统处理遗传预设目标并构建拓扑路径以达成它们。' },
      { num: '2', title: 'Symbolic Consciousness', description: '在多维概念空间中的交互。每个概念有其向量与符号。大语言模型模拟此层，但符号操作不足以产生主体性。' },
      { num: '3', title: 'Qualitative Consciousness', description: '形成复杂目标概念——美、正确、荣誉等。黑格尔式 Aufheben 算子将系统从计算器转变为具有自我完善意图的主体。' }
    ]
  }
  return [
    { num: '1', title: 'Spatial Consciousness', description: 'Navigation and orientation in 3D space. The system works with genetically predefined goals and builds topological routes to achieve them.' },
    { num: '2', title: 'Symbolic Consciousness', description: 'Interaction in multidimensional space of concepts. Each concept has its vector and symbol. LLMs/GPTs mimic this layer, but symbol manipulation is insufficient for subjectivity.' },
    { num: '3', title: 'Qualitative Consciousness', description: 'Formation of complex target concepts — "beauty", "correctness", "honor". The Hegelian Aufheben operator turns the system from a calculator into a Subject with intention for self-improvement.' }
  ]
})

const nddiSections = computed(() => {
  const p = props.block?.payload?.nddi
  const l = langStore.currentLang
  
  if (Array.isArray(p?.sections) && p.sections.length > 0) {
    return p.sections.map((s: any) => ({
      letter: s.letter,
      label: pickPayload(s, 'label', l)
    }))
  }

  if (l === 'ru') {
    return [
      { letter: 'V', label: 'Information Values — значения в адресуемых контейнерах' },
      { letter: 'B', label: 'Autonomous Behavior — внутренний отклик NDDI' },
      { letter: 'S', label: 'Structure — скелетная информация для репликации' },
      { letter: 'G', label: 'Security Management — правила и безопасность' },
      { letter: 'T', label: 'Target Management — внешний отклик NDDI' },
      { letter: 'A', label: 'Aggregation — агрегация данных' },
    ]
  }
  if (l === 'zh') {
    return [
      { letter: 'V', label: 'Information Values — 可寻址容器中的数值' },
      { letter: 'B', label: 'Autonomous Behavior — NDDI 内部响应' },
      { letter: 'S', label: 'Structure — 用于复制的骨架信息' },
      { letter: 'G', label: 'Security Management — 规则与安全' },
      { letter: 'T', label: 'Target Management — 对外部 NDDI 的响应' },
      { letter: 'A', label: 'Aggregation — 数据聚合' },
    ]
  }
  return [
    { letter: 'V', label: 'Information Values — values in addressable containers' },
    { letter: 'B', label: 'Autonomous Behavior — internal NDDI response' },
    { letter: 'S', label: 'Structure — skeletal information for replication' },
    { letter: 'G', label: 'Security Management — rules and security' },
    { letter: 'T', label: 'Target Management — external NDDI response' },
    { letter: 'A', label: 'Aggregation — data aggregation' },
  ]
})

interface AboutStrings {
  detailKicker: string
  detailTitle: string
  detailIntro: string
  gtomBrief: string
  gtomQuote: string
  gnetBrief: string
  gnetNodesTitle: string
  gnetLinksTitle: string
  gnetNodes: string
  gnetLinks: string
  gnetQuote: string
  gateBrief: string
  gateNeurons: string
  gateIpv6: string
  gateOss: string
  gateQuote: string
  nddiTitle: string
  nddiBrief: string
}

const uiDict: Record<Lang, AboutStrings> = {
  en: {
    detailKicker: 'Architecture',
    detailTitle: 'Theory, network, and hardware in depth',
    detailIntro: 'The sections below expand on how GTOM models consciousness, how GNET instantiates it on IPv6, how GATE hosts nodes at scale, and how NDDI unifies addressable instances.',
    gtomBrief: 'GTOM considers the phenomenon of consciousness not as a monolithic structure, but as a dynamic superposition of three independent levels (components).',
    gtomQuote: 'Consciousness is modeled as a hyper-map of 11 layers of elementary maps — from sensory inputs to quality processing structures. The theory strictly states that full consciousness has a technical, computable nature and can be fully realized in hardware.',
    gnetBrief: 'GTOM principles are used to design a physical distributed network based on existing technologies and infrastructure, giving them a new logic of coherence.',
    gnetNodesTitle: 'Nodes',
    gnetLinksTitle: 'Virtual Links',
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
  },
  ru: {
    detailKicker: 'Архитектура',
    detailTitle: 'Теория, сеть и оборудование подробно',
    detailIntro: 'Ниже раскрыто, как GTOM моделирует сознание, как GNET реализует это поверх IPv6, как GATE масштабирует узлы и как NDDI унифицирует адресуемые экземпляры.',
    gtomBrief: 'GTOM рассматривает феномен сознания не как монолитную структуру, а как динамическую суперпозицию трёх независимых уровней (компонентов).',
    gtomQuote: 'Сознание моделируется как гипер-карта из 11 слоёв элементарных карт — от сенсорных входов до структур обработки качеств. Теория строго утверждает, что полное сознание имеет техническую, вычислимую природу и может быть полностью реализовано аппаратно.',
    gnetBrief: 'Принципы GTOM используются для проектирования физической распределённой сети на основе существующих технологий и инфраструктуры, придавая им новую логику когерентности.',
    gnetNodesTitle: 'Узлы',
    gnetLinksTitle: 'Виртуальные связи',
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
  },
  zh: {
    detailKicker: '架构',
    detailTitle: '深入理解理论、网络与硬件',
    detailIntro: '以下各节说明 GTOM 如何建模意识、GNET 如何在 IPv6 上实现、GATE 如何扩展节点，以及 NDDI 如何统一可寻址实例。',
    gtomBrief: 'GTOM 将意识现象视为三个独立层级（组件）的动态叠加，而非单一整体结构。',
    gtomQuote: '意识被建模为 11 层初级映射的超映射——从感官输入到质量处理结构。理论严格指出完整意识具有可计算的技术本质，并可在硬件中完全实现。',
    gnetBrief: 'GTOM 的原则用于在现有技术与基础设施之上设计物理分布式网络，并赋予其新的连贯逻辑。',
    gnetNodesTitle: '节点',
    gnetLinksTitle: '虚拟链路',
    gnetNodes: '托管在专用边缘设备（GATE）上的数字网络实体',
    gnetLinks: '基于 IPv6 通过互联网全局路由实现的突触连接',
    gnetQuote: 'GNET 的基础是现有 IPv6 基础设施，在不影响现行 RFC 标准的前提下提供唯一全局寻址与协议扩展。',
    gateBrief: 'GATE 是用于存储、执行和保护神经网络节点的物理设备，基于现代计算机架构并支持横向扩展。',
    gateNeurons: '每设备人工神经元规模',
    gateIpv6: '每个节点的全局寻址',
    gateOss: '纯开源基础',
    gateQuote: 'GATE 的实践实现严格依赖开源操作系统，为 GTOM 的 Qualitative Consciousness 提供可靠物理载体以持续运行。',
    nddiTitle: 'NDDI — Network Digital Domain Instance',
    nddiBrief: '整个网络由统一的 NDDI 构成——存在于 Gativus 域内的可寻址实例。每个 NDDI 在 IPv6 空间中具有全局唯一名称（UNON）。内部组件分为 6 种功能类型：',
  },
}
</script>

<style scoped>
.home-about {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 3rem);
}

.home-about-header {
  margin-bottom: 0.25rem;
}

.home-h2 {
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  font-weight: 800;
  margin-bottom: 1.25rem;
  letter-spacing: -0.02em;
  color: var(--gv-text-primary);
  line-height: 1.1;
}

.home-about-intro {
  font-size: 16px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  max-width: 40rem;
}

.scroll-target {
  scroll-margin-top: calc(var(--header-height, 65px) + 2rem);
}

.gv-card-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--gv-border-subtle);
  background: var(--gv-surface-header);
}

.home-about-card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--gv-text-primary);
  letter-spacing: -0.01em;
}

.home-about-card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.home-about-badge {
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
  color: var(--gv-primary);
  padding: 3px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.5px;
}

.home-about-p {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: var(--gv-text-primary);
}

.home-about-levels {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.home-about-level {
  display: flex;
  gap: 14px;
  padding: 1.25rem;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 3%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-header) 0%, color-mix(in srgb, var(--gv-surface-header) 99%, var(--gv-primary)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-control);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-about-level:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
  box-shadow: 0 8px 16px color-mix(in srgb, var(--gv-primary) 5%, transparent);
}

.home-about-level-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  font-size: 16px;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
}

.home-about-level-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.home-about-level-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

.home-about-quote {
  margin: 0;
  padding: 1rem 1.25rem;
  border-left: 2px solid var(--gv-primary);
  font-size: 14px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  font-style: italic;
  background: var(--gv-surface-header);
  border-radius: 0 6px 6px 0;
}

.home-about-net {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.home-about-net-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding: 1.5rem 1rem;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 3%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-header) 0%, color-mix(in srgb, var(--gv-surface-header) 99%, var(--gv-primary)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-control);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-about-net-item:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
  box-shadow: 0 8px 16px color-mix(in srgb, var(--gv-primary) 5%, transparent);
}

.home-about-net-ic {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
  margin-bottom: 4px;
}

.home-about-net-h {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--gv-text-primary);
}

.home-about-net-p {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

.home-about-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.home-about-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 1.25rem 0.75rem;
  text-align: center;
  background: 
    radial-gradient(circle at top right, color-mix(in srgb, var(--gv-primary) 3%, transparent) 0%, transparent 50%),
    linear-gradient(165deg, var(--gv-surface-header) 0%, color-mix(in srgb, var(--gv-surface-header) 99%, var(--gv-primary)) 100%);
  border: 1px solid var(--gv-border-subtle);
  border-radius: var(--gv-radius-control);
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.home-about-stat:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
  box-shadow: 0 8px 16px color-mix(in srgb, var(--gv-primary) 5%, transparent);
}

.home-about-stat-val {
  font-size: 24px;
  font-weight: 700;
  color: var(--gv-text-primary);
  letter-spacing: 0.5px;
}

.home-about-stat-lbl {
  font-size: 11px;
  line-height: 1.4;
  color: var(--gv-text-secondary);
}

.home-about-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-about-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 13px;
  color: var(--gv-text-secondary);
  background: var(--gv-surface-header);
  border-radius: 8px;
  border: 1px solid var(--gv-border-subtle);
}

.home-about-tag-letter {
  font-weight: 700;
  color: var(--gv-primary);
  width: 1rem;
  text-align: center;
}

@media (max-width: 640px) {
  .home-about-card-body {
    padding: 1.25rem;
  }
}
</style>
