<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits(['update:modelValue'])

const SYSTEM_DEFAULTS = {
  gtom: {
    brief: 'GTOM considers the phenomenon of consciousness not as a monolithic structure, but as a dynamic superposition of three independent levels (components).',
    brief_ru: 'GTOM рассматривает феномен сознания не как монолитную структуру, а как динамическую суперпозицию трёх независимых уровней (компонентов).',
    brief_zh: 'GTOM 将意识现象视为三个独立层级（组件）的动态叠加，而非单一整体结构。',
    quote: 'Consciousness is modeled as a hyper-map of 11 layers of elementary maps — from sensory inputs to quality processing structures. The theory strictly states that full consciousness has a technical, computable nature and can be fully realized in hardware.',
    quote_ru: 'Сознание моделируется как гипер-карта из 11 слоёв элементарных карт — от сенсорных входов до структур обработки качеств. Теория строго утверждает, что полное сознание имеет техническую, вычислимую природу и может быть полностью реализовано аппаратно.',
    quote_zh: '意识被建模为 11 层初级映射의 초맵핑——从感官输入到质量处理结构。理论严格指出完整意识具有可计算的技术本质，并可在硬件中完全实现。',
    levels: [
      { num: '1', title: 'Spatial Consciousness', title_ru: 'Spatial Consciousness', title_zh: 'Spatial Consciousness', desc: 'Navigation and orientation in 3D space...', desc_ru: 'Навигация и ориентация в 3D-пространстве...', desc_zh: '在三维空间中的导航与定向...' },
      { num: '2', title: 'Symbolic Consciousness', title_ru: 'Symbolic Consciousness', title_zh: 'Symbolic Consciousness', desc: 'Interaction in multidimensional space of concepts...', desc_ru: 'Взаимодействие в многомерном пространстве концептов...', desc_zh: '在多维概念空间中的交互...' },
      { num: '3', title: 'Qualitative Consciousness', title_ru: 'Qualitative Consciousness', title_zh: 'Qualitative Consciousness', desc: 'Formation of complex target concepts...', desc_ru: 'Формирование сложных целевых концептов...', desc_zh: '形成复杂目标概念...' }
    ]
  },
  gnet: {
    brief: 'GTOM principles are used to design a physical distributed network based on existing technologies and infrastructure, giving them a new logic of coherence.',
    brief_ru: 'Принципы GTOM используются для проектирования физической распределённой сети на основе существующих технологий и инфраструктуры, придавая им новую логику когерентности.',
    brief_zh: 'GTOM 的原则用于在现有技术与基础设施之上设计物理分布式网络，并赋予其新的连贯逻辑。',
    quote: 'The basis of GNET is the existing IPv6 infrastructure, providing unique global addressing with protocol extensions without breaking current RFC standards.',
    quote_ru: 'Основа GNET — существующая инфраструктура IPv6, обеспечивающая уникальную глобальную адресацию с расширениями протокола без нарушения текущих стандартов RFC.',
    quote_zh: 'GNET 的基础是现有 IPv6 基础设施，提供唯一全局寻址与协议扩展而不破坏现行 RFC 标准。',
    nodes_title: 'Nodes', nodes_title_ru: 'Узлы', nodes_title_zh: '节点',
    nodes_desc: 'Digital network entities hosted on specialized edge devices (GATE)', nodes_desc_ru: 'Цифровые сетевые сущности, размещённые на специализированных периферийных устройствах (GATE)', nodes_desc_zh: '托管在专用边缘设备（GATE）上的数字网络实体',
    links_title: 'Virtual Links', links_title_ru: 'Виртуальные связи', links_title_zh: '虚拟链路',
    links_desc: 'Synaptic connections via global Internet routing on IPv6 base', links_desc_ru: 'Синаптические соединения через глобальную маршрутизацию Интернета на базе IPv6', links_desc_zh: '基于 IPv6 通过互联网全局路由实现的突触连接'
  },
  gate: {
    brief: 'GATE is a physical device for storing, executing, and protecting neural network nodes. Built on modern computer architectures with horizontal scaling capability.',
    brief_ru: 'GATE — физическое устройство для хранения, исполнения и защиты узлов нейронной сети. Построено на современных компьютерных архитектурах с возможностью горизонтального масштабирования.',
    brief_zh: 'GATE 是用于存储、执行和保护神经网络节点的物理设备，基于现代计算机架构并支持横向扩展。',
    quote: 'The practical implementation of GATE strictly relies on open-source operating systems, providing Qualitative Consciousness (GTOM) with a reliable physical substrate for continuous operation.',
    quote_ru: 'Практическая реализация GATE строго опирается на операционные системы с открытым исходным кодом, предоставляя Qualitative Consciousness (GTOM) надёжный физический субстрат для непрерывной работы.',
    quote_zh: 'GATE 的实践实现严格依赖开源操作系统，为 GTOM 的 Qualitative Consciousness 提供可靠物理载体以持续运行。',
    neurons_val: '10⁹ artificial neurons', neurons_val_ru: '10⁹ искусственных нейронов', neurons_val_zh: '10⁹ 每设备人工神经元规模',
    ipv6_val: 'global addressing', ipv6_val_ru: 'глобальная адресация', ipv6_val_zh: '每个节点的全局寻址',
    oss_val: 'exclusively open-source', oss_val_ru: 'исключительно open-source', oss_val_zh: '纯开源基础'
  },
  nddi: {
    title: 'NDDI — Network Digital Domain Instance',
    title_ru: 'NDDI — Network Digital Domain Instance',
    title_zh: 'NDDI — Network Digital Domain Instance',
    brief: 'The entire network is built from unified NDDIs — addressable instances existing within the Gativus domain. Each NDDI has a globally unique name (UNON) in IPv6 space. Internal NDDI components are grouped into 6 functional types:',
    brief_ru: 'Вся сеть построена из унифицированных NDDI — адресуемых экземпляров, существующих в рамках домена Gativus. Каждый NDDI обладает глобально уникальным именем (UNON) в пространстве IPv6. Внутренние компоненты NDDI группируются в 6 функциональных типов:',
    brief_zh: '整个网络由统一의 NDDI 构成——存在于 Gativus 域内的可寻址实例。每个 NDDI 在 IPv6 空间中具有全局唯一名称（UNON）。内部组件分为 6 种功能类型：',
    sections: [
      { letter: 'V', label: 'Information Values', label_ru: 'Information Values — значения в адресуемых контейнерах', label_zh: 'Information Values — 可寻址容器中的数值' },
      { letter: 'B', label: 'Autonomous Behavior', label_ru: 'Autonomous Behavior — внутренний отклик NDDI', label_zh: 'Autonomous Behavior — NDDI 内部响应' },
      { letter: 'S', label: 'Structure', label_ru: 'Structure — скелетная информация для репликации', label_zh: 'Structure — 用于复制的骨架信息' },
      { letter: 'G', label: 'Security Management', label_ru: 'Security Management — правила и безопасность', label_zh: 'Security Management — 规则与安全' },
      { letter: 'T', label: 'Target Management', label_ru: 'Target Management — внешний отклик NDDI', label_zh: 'Target Management — 对外部 NDDI 的响应' },
      { letter: 'A', label: 'Aggregation', label_ru: 'Aggregation — агрегация данных', label_zh: 'Aggregation — 데이터聚合' }
    ]
  }
}

const data = ref<any>(JSON.parse(JSON.stringify(SYSTEM_DEFAULTS)))

const activeLang = ref<'en' | 'ru' | 'zh'>('en')

// Initialize data from modelValue
watch(() => props.modelValue, (val) => {
  if (!val) return
  try {
    const parsed = JSON.parse(val || '{}')
    const hasData = Object.keys(parsed).length > 0
    
    if (!hasData) {
      // If empty, load system defaults
      data.value = JSON.parse(JSON.stringify(SYSTEM_DEFAULTS))
    } else {
      // Deep merge with defaults to ensure all keys exist
      Object.keys(SYSTEM_DEFAULTS).forEach(sectionKey => {
        const section = sectionKey as keyof typeof SYSTEM_DEFAULTS
        if (parsed[section]) {
          Object.keys(SYSTEM_DEFAULTS[section]).forEach(fieldKey => {
            const field = fieldKey as string
            const val = parsed[section][field]
            if (val !== undefined && val !== null && val !== '') {
              data.value[section][field] = val
            } else {
              data.value[section][field] = (SYSTEM_DEFAULTS[section] as any)[field]
            }
          })
        } else {
          data.value[section] = JSON.parse(JSON.stringify(SYSTEM_DEFAULTS[section]))
        }
      })
    }
    
    // Ensure arrays for levels and sections
    if (parsed.gtom?.levels && Array.isArray(parsed.gtom.levels) && parsed.gtom.levels.length > 0) {
      data.value.gtom.levels = JSON.parse(JSON.stringify(parsed.gtom.levels))
    }
    if (parsed.nddi?.sections && Array.isArray(parsed.nddi.sections) && parsed.nddi.sections.length > 0) {
      data.value.nddi.sections = JSON.parse(JSON.stringify(parsed.nddi.sections))
    }
  } catch {
    // invalid json
  }
}, { immediate: true })

// Emit updates
watch(data, (newVal) => {
  const json = JSON.stringify(newVal, null, 2)
  if (json !== props.modelValue) {
    emit('update:modelValue', json)
  }
}, { deep: true })

function addGtomLevel() {
  data.value.gtom.levels.push({ num: '', title: '', title_ru: '', title_zh: '', desc: '', desc_ru: '', desc_zh: '' })
}
function addNddiSection() {
  data.value.nddi.sections.push({ letter: '', label: '', label_ru: '', label_zh: '' })
}

const suffix = computed(() => {
  if (activeLang.value === 'ru') return '_ru'
  if (activeLang.value === 'zh') return '_zh'
  return ''
})

const langLabel = computed(() => activeLang.value.toUpperCase())
</script>

<template>
  <div class="admin-arch-editor space-y-8">
    <!-- Language Toggle -->
    <div class="flex items-center justify-between p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-language" class="text-sky-500" />
        <span class="text-sm font-bold opacity-70 uppercase tracking-widest">Язык контента архитектуры</span>
      </div>
      <div class="flex gap-1">
        <GvButton 
          v-for="l in ['en', 'ru', 'zh']" 
          :key="l" 
          size="xs" 
          :variant="activeLang === l ? 'solid' : 'ghost'"
          :color="activeLang === l ? 'sky' : 'gray'"
          @click="activeLang = l as any"
        >
          {{ l.toUpperCase() }}
        </GvButton>
      </div>
    </div>

    <!-- GTOM -->
    <div class="section-card-mini">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-sky-500 text-white shadow-sm"><UIcon name="i-heroicons-light-bulb" /></div>
        <h3 class="font-bold">GTOM — Theory of Mind ({{ langLabel }})</h3>
      </div>
      <div class="grid grid-cols-1 gap-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormGroup :label="'Brief' + suffix">
            <UTextarea v-model="data.gtom['brief' + suffix]" :rows="2" />
          </UFormGroup>
          <UFormGroup :label="'Quote' + suffix">
            <UTextarea v-model="data.gtom['quote' + suffix]" :rows="2" />
          </UFormGroup>
        </div>
        <div class="space-y-3">
          <div v-for="(lvl, idx) in data.gtom.levels" :key="idx" class="flex gap-2 items-start p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5">
            <UInput v-model="lvl.num" placeholder="#" class="w-12" />
            <div class="flex-1 space-y-2">
              <UInput v-model="lvl['title' + suffix]" :placeholder="'Level Title ' + langLabel" />
              <UTextarea v-model="lvl['desc' + suffix]" :rows="2" :placeholder="'Description ' + langLabel" />
            </div>
            <GvButton chromeless icon="i-heroicons-trash" color="red" size="xs" @click="data.gtom.levels.splice(idx, 1)" />
          </div>
          <GvButton variant="soft" color="sky" size="xs" icon="i-heroicons-plus" @click="addGtomLevel">Добавить уровень</GvButton>
        </div>
      </div>
    </div>

    <!-- GNET -->
    <div class="section-card-mini">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-sky-500 text-white shadow-sm"><UIcon name="i-heroicons-share" /></div>
        <h3 class="font-bold">GNET — Network ({{ langLabel }})</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormGroup :label="'Brief' + suffix"><UTextarea v-model="data.gnet['brief' + suffix]" :rows="2" /></UFormGroup>
        <UFormGroup :label="'Quote' + suffix"><UTextarea v-model="data.gnet['quote' + suffix]" :rows="2" /></UFormGroup>
        <UFormGroup :label="'Nodes Title' + suffix"><UInput v-model="data.gnet['nodes_title' + suffix]" /></UFormGroup>
        <UFormGroup :label="'Nodes Desc' + suffix"><UInput v-model="data.gnet['nodes_desc' + suffix]" /></UFormGroup>
        <UFormGroup :label="'Links Title' + suffix"><UInput v-model="data.gnet['links_title' + suffix]" /></UFormGroup>
        <UFormGroup :label="'Links Desc' + suffix"><UInput v-model="data.gnet['links_desc' + suffix]" /></UFormGroup>
      </div>
    </div>

    <!-- GATE -->
    <div class="section-card-mini">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-sky-500 text-white shadow-sm"><UIcon name="i-heroicons-cpu-chip" /></div>
        <h3 class="font-bold">GATE — Edge Device ({{ langLabel }})</h3>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormGroup :label="'Brief' + suffix"><UTextarea v-model="data.gate['brief' + suffix]" :rows="2" /></UFormGroup>
        <UFormGroup :label="'Quote' + suffix"><UTextarea v-model="data.gate['quote' + suffix]" :rows="2" /></UFormGroup>
        <UFormGroup :label="'Neurons Val' + suffix"><UInput v-model="data.gate['neurons_val' + suffix]" /></UFormGroup>
        <UFormGroup :label="'IPv6 Val' + suffix"><UInput v-model="data.gate['ipv6_val' + suffix]" /></UFormGroup>
        <UFormGroup :label="'OSS Val' + suffix"><UInput v-model="data.gate['oss_val' + suffix]" /></UFormGroup>
      </div>
    </div>

    <!-- NDDI -->
    <div class="section-card-mini">
      <div class="flex items-center gap-3 mb-4">
        <div class="p-2 rounded-lg bg-sky-500 text-white shadow-sm"><UIcon name="i-heroicons-rectangle-stack" /></div>
        <h3 class="font-bold">NDDI — Instance ({{ langLabel }})</h3>
      </div>
      <div class="grid grid-cols-1 gap-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormGroup :label="'Custom Title' + suffix"><UInput v-model="data.nddi['title' + suffix]" /></UFormGroup>
          <UFormGroup :label="'Brief' + suffix"><UTextarea v-model="data.nddi['brief' + suffix]" :rows="2" /></UFormGroup>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div v-for="(s, idx) in data.nddi.sections" :key="idx" class="p-2 rounded-lg bg-black/5 border border-black/5 flex items-center gap-2">
            <UInput v-model="s.letter" class="w-8 font-black" placeholder="L" />
            <UInput v-model="s['label' + suffix]" class="flex-1" :placeholder="'Label ' + langLabel" />
            <GvButton chromeless icon="i-heroicons-x-mark" color="red" size="xs" @click="data.nddi.sections.splice(idx, 1)" />
          </div>
          <GvButton variant="soft" color="sky" size="xs" icon="i-heroicons-plus" @click="addNddiSection">Добавить секцию</GvButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-card-mini {
  padding: 1.25rem;
  border-radius: 20px;
  background: var(--gv-surface-card);
  border: 1px solid var(--gv-border-subtle);
  box-shadow: var(--gv-shadow-sm);
}
</style>
