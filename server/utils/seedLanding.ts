/**
 * Landing page canonical rows (legacy static index). Full seed if table empty;
 * migrate also backfills any missing anchor_id and republishes the six default sections.
 */
import type { Database } from 'db0'
import { runLandingBlockInsert } from './landingInsertRow'

/** Стабильные якоря первого релиза лендинга (6 секций как на старой главной). */
export const LANDING_CANONICAL_ANCHORS = [
  'home-hero',
  'home-pillars',
  'home-manifest',
  'home-about',
  'home-wiki',
  'home-cta',
] as const

function buildPayloads() {
  const heroPayload = JSON.stringify({
    ctas: [
      {
        label_en: 'About',
        label_ru: 'О проекте',
        label_zh: '关于',
        href: '/#about-detail',
        icon: 'i-heroicons-sparkles',
        color: 'sky',
        variant: 'solid',
      },
      {
        label_en: 'Books',
        label_ru: 'Книги',
        label_zh: '书籍',
        href: '/books',
        icon: 'i-heroicons-book-open',
        color: 'gray',
        variant: 'outline',
      },
    ],
  })

  const cardPayload = JSON.stringify({
    cards: [
      {
        badge: 'GTOM',
        title_en: 'GTOM (Gativus Theory of Mind)',
        title_ru: 'GTOM (Gativus Theory of Mind)',
        title_zh: 'GTOM (Gativus 心智理论)',
        desc_en: 'The foundational theory that defines the architecture and mechanics of consciousness.',
        desc_ru: 'Базовая теория, определяющая архитектуру и механику сознания.',
        desc_zh: '定义意识架构和机制的奠基性理论。',
        image: '/images/logo.png',
        href: '/#about-gtom',
      },
      {
        badge: 'GNET',
        title_en: 'GNET (Gativus Network)',
        title_ru: 'GNET (Gativus Network)',
        title_zh: 'GNET (Gativus 网络)',
        desc_en: 'The network topology specification, describing the physical network structure in strict accordance with GTOM principles.',
        desc_ru: 'Спецификация топологии сети, описывающая физическую структуру сети строго в соответствии с принципами GTOM.',
        desc_zh: '网络拓扑规范，严格按照 GTOM 原则描述物理网络结构。',
        image: '/images/gnet-second-view.png',
        href: '/#about-gnet',
      },
      {
        badge: 'GATE',
        title_en: 'GATE (Gativus Edge Device)',
        title_ru: 'GATE (Gativus Edge Device)',
        title_zh: 'GATE (Gativus 边缘设备)',
        desc_en: 'The physical hardware and runtime environment designed to host the nodes of the GNET network.',
        desc_ru: 'Физическое оборудование и среда исполнения, предназначенные для узлов сети GNET.',
        desc_zh: '旨在托管 GNET 网络节点的物理硬件和运行时环境。',
        image: '/images/gate.png',
        href: '/#about-gate',
      },
    ],
  })

  const linkPayload = JSON.stringify({
    links: [
      {
        label_en: 'Books',
        label_ru: 'Книги',
        label_zh: '书籍',
        desc_en: 'Each digital entity is a flexible container of functions that model individual artificial neurons, cortical columns, and more complex hierarchical groups.',
        desc_ru: 'Каждая цифровая сущность — гибкий контейнер функций, моделирующий отдельные искусственные нейроны, корковые столбы и более сложные иерархические группы.',
        desc_zh: '每个数字实体都是一个灵活的函数容器，用于建模单个人工神经元、皮质柱以及更复杂的层次结构群。',
        icon: 'i-heroicons-book-open',
        href: '/books',
        accent: 'book',
      },
      {
        label_en: 'Articles',
        label_ru: 'Статьи',
        label_zh: '文章',
        desc_en: 'Each digital entity is a flexible container of functions that model individual artificial neurons, cortical columns, and more complex hierarchical groups.',
        desc_ru: 'Каждая цифровая сущность — гибкий контейнер функций, моделирующий отдельные искусственные нейроны, корковые столбы и более сложные иерархические группы.',
        desc_zh: '每个数字实体都是一个灵活的函数容器，用于建模单个人工神经元、皮质柱以及更复杂的层次结构群。',
        icon: 'i-heroicons-document-text',
        href: '/articles',
        accent: 'article',
      },
      {
        label_en: 'Glossary',
        label_ru: 'Глоссарий',
        label_zh: '术语表',
        desc_en: 'Managing interactions within a multidimensional space of concepts regarding surrounding objects and actions upon them.',
        desc_ru: 'Управление взаимодействиями в многомерном пространстве концепций касательно окружающих объектов и действий над ними.',
        desc_zh: '在关于周围对象和对其操作的多维概念空间中管理交互。',
        icon: 'i-heroicons-bookmark-square',
        href: '/glossary',
        accent: 'term',
      },
      {
        label_en: 'Network topology specification',
        label_ru: 'Спецификация топологии сети',
        label_zh: '网络拓扑规范',
        desc_en: 'The network topology specification, describing the physical network structure in strict accordance with GTOM principles.',
        desc_ru: 'Спецификация топологии сети, описывающая физическую структуру сети строго в соответствии с принципами GTOM.',
        desc_zh: '网络拓扑规范，严格按照 GTOM 原则描述物理网络结构。',
        icon: 'i-heroicons-share',
        href: '/knowledge-graph',
        accent: 'graph',
      },
    ],
  })

  const ctaPayload = JSON.stringify({
    buttons: [
      { label_en: 'Articles', label_ru: 'Статьи', label_zh: '文章', href: '/articles', icon: 'i-heroicons-document-text', color: 'sky', variant: 'solid' },
      { label_en: 'Glossary', label_ru: 'Глоссарий', label_zh: '术语表', href: '/glossary', icon: 'i-heroicons-bookmark-square', color: 'gray', variant: 'outline' },
      { label_en: 'Network topology specification', label_ru: 'Спецификация топологии сети', label_zh: '网络拓扑规范', href: '/knowledge-graph', icon: 'i-heroicons-share', color: 'gray', variant: 'outline' },
      { label_en: 'info@gativus.com', label_ru: 'info@gativus.com', label_zh: 'info@gativus.com', href: 'mailto:info@gativus.com', icon: 'i-heroicons-envelope', color: 'gray', variant: 'outline' },
    ],
  })

  return { heroPayload, cardPayload, linkPayload, ctaPayload }
}

/** 24 значения на строку; индекс 3 — anchor_id */
function canonicalLandingInsertArgs(): unknown[][] {
  const { heroPayload, cardPayload, linkPayload, ctaPayload } = buildPayloads()
  return [
    [
      0, 1, 'hero', 'home-hero',
      'Hero', 'Старт', '首页',
      'The GATIVUS project', 'Проект GATIVUS', 'GATIVUS 项目',
      'GATIVUS', 'GATIVUS', 'GATIVUS',
      'GTOM · GNET · GATE', 'GTOM · GNET · GATE', 'GTOM · GNET · GATE',
      'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
      'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, осуществляющих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
      'GATIVUS 项目由三个紧密关联的子系统组成，涵盖从抽象理论到网络协议与硬件设施。',
      null, null, null,
      '/images/121px-Logo.jpg',
      heroPayload,
    ],
    [
      1, 1, 'card_row', 'home-pillars',
      'Pillars', 'Опоры', '支柱',
      'Three fundamental and inextricably linked subsystems', 'Три фундаментальные и неразрывно связанные подсистемы', '三个紧密关联的子系统',
      'GTOM · GNET · GATE', 'GTOM · GNET · GATE', 'GTOM · GNET · GATE',
      null, null, null,
      null, null, null,
      null, null, null,
      null,
      cardPayload,
    ],
    [
      2, 1, 'richtext', 'home-manifest',
      'Overview', 'Обзор', '概述',
      'The GATIVUS project', 'Проект GATIVUS', 'GATIVUS 项目',
      'From abstract theory to network protocol and physical hardware',
      'От абстрактной теории к сетевому протоколу и физическому оборудованию',
      '从抽象理论到网络协议与硬件',
      null,
      null,
      null,
      'GTOM treats consciousness as a dynamic superposition of three independent levels, not a single block. The same thread runs through formal theory (GTOM), coherent networking on IPv6 (GNET), and edge hardware that scales to billions of neurons (GATE). The sections below unpack each layer.',
      'GTOM описывает сознание как суперпозицию трёх уровней, а не монолит. От формальной теории (GTOM) — к когерентной сети на IPv6 (GNET) и граничному оборудованию, масштабируемому до миллиардов нейронов (GATE). Ниже каждый уровень раскрыт подробно.',
      'GTOM 将意识视为三个独立层级的动态叠加，而非单一整体。同一条主线贯穿了形式理论（GTOM）、基于 IPv6 的相干网络（GNET）以及可扩展至数十亿神经元的边缘硬件（GATE）。以下章节将详细展开每一层。',
      'Within GTOM, consciousness is modeled as a hyper-map consisting of 11 layers of elementary maps (ranging from sensory inputs to quality processing structures). Each map is a neural construct.',
      'В рамках GTOM сознание моделируется как гипер-карта, состоящая из 11 слоёв элементарных карт (от сенсорных входов до структур качественной обработки). Каждая карта — нейральная конструкт.',
      '在 GTOM 框架下，意识被建模为由 11 层初级映射（从感官输入到质量处理结构）组成的超映射。每个映射都是一个神经构建体。',
      null,
      '{}',
    ],
    [
      3, 1, 'about', 'home-about',
      'Architecture', 'Архитектура', '架构',
      null, null, null,
      null, null, null,
      null, null, null,
      null, null, null,
      null, null, null,
      null,
      '{}',
    ],
    [
      4, 1, 'link_grid', 'home-wiki',
      'Wiki', 'Вики', '知识库',
      'The principles defined in GTOM are utilized to design a physical, distributed network',
      'Принципы, определённые в GTOM, используются для проектирования физической распределённой сети',
      'GTOM 所定义的原则用于设计物理分布式网络',
      'The Gativus consciousness network is conceptualized as a dynamic set of:',
      'Сеть сознания Gativus концептуализируется как динамическое множество:',
      'Gativus 意识网络被概念化为一个动态集合：',
      null,
      null,
      null,
      'Nodes: Network digital entities hosted on specialized edge devices (GATE). Virtual Links (Synapses): Connections executed and maintained via global Internet routing.',
      'Узлы (Nodes): сетевые цифровые сущности, размещённые на специализированных граничных устройствах (GATE). Виртуальные связи (синапсы): соединения, выполняемые и поддерживаемые через глобальную интернет-маршрутизацию.',
      '节点：托管在专用边缘设备（GATE）上的网络数字实体。虚拟连接：经由全球互联网路由维护的突触连接。',
      null,
      null,
      null,
      null,
      linkPayload,
    ],
    [
      5, 1, 'cta', 'home-cta',
      'Join', 'Участие', '参与',
      null, null, null,
      'Unified, distributed consciousness', 'Единое распределённое сознание', '统一的分布式意识',
      null, null, null,
      'Any entity created according to the GNET specification automatically becomes an active node in the Gativus network, participating in the unified, distributed consciousness.',
      'Любая сущность, созданная по спецификации GNET, автоматически становится активным узлом в сети Gativus, участвующим в едином распределённом сознании.',
      '根据 GNET 规范创建的任何实体都将自动成为 Gativus 网络中的活跃节点，参与到统一的分布式意识中。',
      null, null, null,
      null,
      ctaPayload,
    ],
  ]
}

export async function seedLandingBlocksIfEmpty(db: Database) {
  const row = await db.prepare('SELECT COUNT(*) as n FROM landing_blocks').get() as { n: number } | undefined
  if (row && Number(row.n) > 0) {
    console.log('[migrate] landing_blocks non-empty, skip full seed')
    return
  }

  for (const args of canonicalLandingInsertArgs())
    await runLandingBlockInsert(db, args)

  console.log('[migrate] Seeded landing_blocks (6 rows)')
}

/**
 * Если таблица уже была частично заполнена, досаживаем только отсутствующие канонические anchor_id.
 * Возвращает список вставленных якорей (для админки / логов).
 */
export async function backfillMissingCanonicalLandingBlocks(db: Database): Promise<{ insertedAnchors: string[] }> {
  const insertedAnchors: string[] = []
  for (const args of canonicalLandingInsertArgs()) {
    const anchor = String(args[3])
    const ex = await db.prepare('SELECT id FROM landing_blocks WHERE anchor_id = ?').get(anchor) as { id: number } | undefined
    if (!ex) {
      await runLandingBlockInsert(db, args)
      insertedAnchors.push(anchor)
      console.log(`[migrate] landing_blocks backfill inserted anchor=${anchor}`)
    }
  }
  if (insertedAnchors.length === 0)
    console.log('[migrate] landing_blocks backfill: nothing missing')
  return { insertedAnchors }
}

/**
 * Updates Chinese translations in existing database rows for canonical anchors.
 * This preserves English/Russian custom edits but injects/updates the Chinese fields.
 */
export async function forceUpdateChineseTranslationsInDb(db: Database) {
  console.log('[migrate] Force updating Chinese translations for landing_blocks...')
  const argsList = canonicalLandingInsertArgs()
  for (const args of argsList) {
    const anchorId = String(args[3])
    // Find if the block exists
    const existing = await db.prepare('SELECT id, payload_json FROM landing_blocks WHERE anchor_id = ?').get(anchorId) as { id: number, payload_json: string | null } | undefined
    if (existing) {
      const neuron_label_zh = args[6] ? String(args[6]) : null
      const kicker_zh = args[9] ? String(args[9]) : null
      const title_zh = args[12] ? String(args[12]) : null
      const subtitle_zh = args[15] ? String(args[15]) : null
      const body_zh = args[18] ? String(args[18]) : null
      const footnote_zh = args[21] ? String(args[21]) : null

      // Parse payload and merge Chinese keys
      let newPayloadJson = existing.payload_json
      try {
        const canonicalPayload = JSON.parse(args[23] as string || '{}')
        const currentPayload = JSON.parse(existing.payload_json || '{}')
        
        // Merge CTAs
        if (Array.isArray(canonicalPayload.ctas) && Array.isArray(currentPayload.ctas)) {
          for (let i = 0; i < currentPayload.ctas.length; i++) {
            if (canonicalPayload.ctas[i]?.label_zh) {
              currentPayload.ctas[i].label_zh = canonicalPayload.ctas[i].label_zh
            }
          }
        }
        // Merge Cards
        if (Array.isArray(canonicalPayload.cards) && Array.isArray(currentPayload.cards)) {
          for (let i = 0; i < currentPayload.cards.length; i++) {
            if (canonicalPayload.cards[i]?.title_zh) {
              currentPayload.cards[i].title_zh = canonicalPayload.cards[i].title_zh
            }
            if (canonicalPayload.cards[i]?.desc_zh) {
              currentPayload.cards[i].desc_zh = canonicalPayload.cards[i].desc_zh
            }
          }
        }
        // Merge Links
        if (Array.isArray(canonicalPayload.links) && Array.isArray(currentPayload.links)) {
          for (let i = 0; i < currentPayload.links.length; i++) {
            if (canonicalPayload.links[i]?.label_zh) {
              currentPayload.links[i].label_zh = canonicalPayload.links[i].label_zh
            }
            if (canonicalPayload.links[i]?.desc_zh) {
              currentPayload.links[i].desc_zh = canonicalPayload.links[i].desc_zh
            }
          }
        }
        // Merge Buttons
        if (Array.isArray(canonicalPayload.buttons) && Array.isArray(currentPayload.buttons)) {
          for (let i = 0; i < currentPayload.buttons.length; i++) {
            if (canonicalPayload.buttons[i]?.label_zh) {
              currentPayload.buttons[i].label_zh = canonicalPayload.buttons[i].label_zh
            }
          }
        }
        newPayloadJson = JSON.stringify(currentPayload)
      } catch (err) {
        console.error(`[migrate] Failed to merge payload_json for ${anchorId}:`, err)
      }

      await db.prepare(`
        UPDATE landing_blocks
        SET
          neuron_label_zh = ?,
          kicker_zh = ?,
          title_zh = ?,
          subtitle_zh = ?,
          body_zh = ?,
          footnote_zh = ?,
          payload_json = ?
        WHERE id = ?
      `).run(
        neuron_label_zh,
        kicker_zh,
        title_zh,
        subtitle_zh,
        body_zh,
        footnote_zh,
        newPayloadJson,
        existing.id
      )
    }
  }
  console.log('[migrate] Chinese translations successfully updated in landing_blocks ✓')
}
