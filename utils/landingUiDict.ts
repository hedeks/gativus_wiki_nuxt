/**
 * Static copy for landing SEO + client-side fallback when /api/landing is empty.
 */
export interface LandingUiStrings {
  heroBrand: string
  heroEyebrow: string
  heroTagline: string
  heroLede: string
  wikiHint: string
  ctaAbout: string
  ctaBooks: string
  kickerProject: string
  manifestTitle: string
  manifestBody: string
  kickerPillars: string
  pillarsTitle: string
  kickerWiki: string
  wikiTitle: string
  wikiSub: string
  wikiBooks: string
  wikiBooksDesc: string
  wikiArticles: string
  wikiArticlesDesc: string
  wikiGlossary: string
  wikiGlossaryDesc: string
  wikiGraph: string
  wikiGraphDesc: string
  ctaClosingTitle: string
  ctaClosingText: string
  ctaArticles: string
  ctaGlossary: string
  metaTitle: string
  metaDesc: string
  wtgGtomTitle: string
  wtgGtomDesc: string
  wtgGnetTitle: string
  wtgGnetDesc: string
  wtgGateTitle: string
  wtgGateDesc: string
  neuronHero: string
  neuronPillars: string
  neuronManifest: string
  neuronAbout: string
  neuronWiki: string
  neuronCta: string
}

const en: LandingUiStrings = {
  heroBrand: 'GATIVUS',
  heroEyebrow: 'The GATIVUS project',
  heroTagline: 'GTOM · GNET · GATE',
  heroLede:
    'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
  wikiHint:
    'Within GTOM, consciousness is modeled as a hyper-map consisting of 11 layers of elementary maps (ranging from sensory inputs to quality processing structures). Each map is a neural construct.',
  ctaAbout: 'About',
  ctaBooks: 'Books',
  kickerProject: 'The GATIVUS project',
  manifestTitle: 'From abstract theory to network protocol and physical hardware',
  manifestBody:
    'GTOM treats consciousness as a dynamic superposition of three independent levels, not a single block. The same thread runs through formal theory (GTOM), coherent networking on IPv6 (GNET), and edge hardware that scales to billions of neurons (GATE). The sections below unpack each layer.',
  kickerPillars: 'Three fundamental and inextricably linked subsystems',
  pillarsTitle: 'GTOM · GNET · GATE',
  kickerWiki:
    'The principles defined in GTOM are utilized to design a physical, distributed network',
  wikiTitle:
    'The Gativus consciousness network is conceptualized as a dynamic set of:',
  wikiSub:
    'Nodes: Network digital entities hosted on specialized edge devices (GATE). Virtual Links (Synapses): Connections executed and maintained via global Internet routing.',
  wikiBooks: 'Books',
  wikiBooksDesc: 'Manifest order and author\'s will.',
  wikiArticles: 'Articles',
  wikiArticlesDesc: 'A bridge between idea and embodiment.',
  wikiGlossary: 'Glossary',
  wikiGlossaryDesc: 'Seeds of meaning and atoms of knowledge.',
  wikiGraph: 'Topology',
  wikiGraphDesc: 'Visual geometry of meaning architecture.',
  ctaClosingTitle: 'Unified, distributed consciousness',
  ctaClosingText:
    'Any entity created according to the GNET specification automatically becomes an active node in the Gativus network, participating in the unified, distributed consciousness.',
  ctaArticles: 'Articles',
  ctaGlossary: 'Glossary',
  metaTitle:
    'GATIVUS — GTOM · GNET · GATE: abstract theory, network protocol, physical hardware',
  metaDesc:
    'The GATIVUS project consists of three fundamental and inextricably linked subsystems, realizing the transition from abstract theory to network protocol and physical hardware.',
  wtgGtomTitle: 'GTOM (Gativus Theory of Mind)',
  wtgGtomDesc:
    'The foundational theory that defines the architecture and mechanics of consciousness.',
  wtgGnetTitle: 'GNET (Gativus Network)',
  wtgGnetDesc:
    'The network topology specification, describing the physical network structure in strict accordance with GTOM principles.',
  wtgGateTitle: 'GATE (Gativus Edge Device)',
  wtgGateDesc:
    'The physical hardware and runtime environment designed to host the nodes of the GNET network.',
  neuronHero: 'Hero',
  neuronPillars: 'Pillars',
  neuronManifest: 'Overview',
  neuronAbout: 'Architecture',
  neuronWiki: 'Wiki',
  neuronCta: 'Join',
}

const ru: LandingUiStrings = {
  heroBrand: 'GATIVUS',
  heroEyebrow: 'Проект GATIVUS',
  heroTagline: 'GTOM · GNET · GATE',
  heroLede:
    'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, осуществляющих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
  wikiHint:
    'В рамках GTOM сознание моделируется как гипер-карта, состоящая из 11 слоёв элементарных карт (от сенсорных входов до структур качественной обработки). Каждая карта — нейральная конструкт.',
  ctaAbout: 'О проекте',
  ctaBooks: 'Книги',
  kickerProject: 'Проект GATIVUS',
  manifestTitle:
    'От абстрактной теории к сетевому протоколу и физическому оборудованию',
  manifestBody:
    'GTOM описывает сознание как суперпозицию трёх уровней, а не монолит. От формальной теории (GTOM) — к когерентной сети на IPv6 (GNET) и граничному оборудованию, масштабируемому до миллиардов нейронов (GATE). Ниже каждый уровень раскрыт подробно.',
  kickerPillars: 'Три фундаментальные и неразрывно связанные подсистемы',
  pillarsTitle: 'GTOM · GNET · GATE',
  kickerWiki:
    'Принципы, определённые в GTOM, используются для проектирования физической распределённой сети',
  wikiTitle:
    'Сеть сознания Gativus концептуализируется как динамическое множество:',
  wikiSub:
    'Узлы (Nodes): сетевые цифровые сущности, размещённые на специализированных граничных устройствах (GATE). Виртуальные связи (синапсы): соединения, выполняемые и поддерживаемые через глобальную интернет-маршрутизацию.',
  wikiBooks: 'Книги',
  wikiBooksDesc: 'Проявленный порядок и воля автора.',
  wikiArticles: 'Статьи',
  wikiArticlesDesc: 'Мост между идеей и воплощением.',
  wikiGlossary: 'Глоссарий',
  wikiGlossaryDesc: 'Семена смыслов и атомы знаний.',
  wikiGraph: 'Топология',
  wikiGraphDesc: 'Визуальная геометрия архитектуры смыслов.',
  ctaClosingTitle: 'Единое распределённое сознание',
  ctaClosingText:
    'Любая сущность, созданная по спецификации GNET, автоматически становится активным узлом в сети Gativus, участвующим в едином распределённом сознании.',
  ctaArticles: 'Статьи',
  ctaGlossary: 'Глоссарий',
  metaTitle:
    'GATIVUS — GTOM · GNET · GATE: абстрактная теория, сетевой протокол, физическое оборудование',
  metaDesc:
    'Проект GATIVUS состоит из трёх фундаментальных и неразрывно связанных подсистем, осуществляющих переход от абстрактной теории к сетевому протоколу и физическому оборудованию.',
  wtgGtomTitle: 'GTOM (Gativus Theory of Mind)',
  wtgGtomDesc:
    'Базовая теория, определяющая архитектуру и механику сознания.',
  wtgGnetTitle: 'GNET (Gativus Network)',
  wtgGnetDesc:
    'Спецификация топологии сети, описывающая физическую структуру сети строго в соответствии с принципами GTOM.',
  wtgGateTitle: 'GATE (Gativus Edge Device)',
  wtgGateDesc:
    'Физическое оборудование и среда исполнения, предназначенные для узлов сети GNET.',
  neuronHero: 'Старт',
  neuronPillars: 'Опоры',
  neuronManifest: 'Обзор',
  neuronAbout: 'Архитектура',
  neuronWiki: 'Вики',
  neuronCta: 'Участие',
}

export const uiDict: Record<'en' | 'ru' | 'zh', LandingUiStrings> = {
  en,
  ru,
  zh: {
    heroBrand: 'GATIVUS',
    heroEyebrow: 'Gativus 项目',
    heroTagline: 'GTOM · GNET · GATE',
    heroLede: 'Gativus 项目由三个基础且密不可分的子系统组成，实现了从抽象理论到网络协议和物理硬件的过渡。',
    wikiHint: '在 GTOM 框架下，意识被建模为由 11 层初级映射（从感官输入到质量处理结构）组成的超映射。每个映射都是一个神经构建体。',
    ctaAbout: '关于项目',
    ctaBooks: '书籍',
    kickerProject: 'Gativus 项目',
    manifestTitle: '从抽象理论到网络协议和物理硬件',
    manifestBody: 'GTOM 将意识视为三个独立层级的动态叠加，而非单一整体。同一条主线贯穿了形式理论（GTOM）、基于 IPv6 的相干网络（GNET）以及可扩展至数十亿神经元的边缘硬件（GATE）。以下章节将详细展开每一层。',
    kickerPillars: '三个基础且密不可分的子系统',
    pillarsTitle: 'GTOM · GNET · GATE',
    kickerWiki: 'GTOM 中定义的原则被用于设计一个物理的分布式网络',
    wikiTitle: 'Gativus 意识网络被概念化为一个动态集合：',
    wikiSub: '节点：托管在专用边缘设备（GATE）上的网络数字实体。虚拟连接（突触）：通过全球互联网路由执行与维护的连接。',
    wikiBooks: '书籍',
    wikiBooksDesc: '显现的秩序与作者意志。',
    wikiArticles: '文章',
    wikiArticlesDesc: '思想与体现之间的桥梁。',
    wikiGlossary: '术语表',
    wikiGlossaryDesc: '意义的种子与知识的原子。',
    wikiGraph: '拓扑结构',
    wikiGraphDesc: '意义架构的视觉几何学。',
    ctaClosingTitle: '统一的分布式意识',
    ctaClosingText: '根据 GNET 规范创建的任何实体都将自动成为 Gativus 网络中的活跃节点，参与到统一的分布式意识中。',
    ctaArticles: '文章',
    ctaGlossary: '术语表',
    metaTitle: 'GATIVUS — GTOM · GNET · GATE: 抽象理论、网络协议、物理硬件',
    metaDesc: 'Gativus 项目由三个基础且密不可分的子系统组成，实现了从抽象理论到网络协议和物理硬件的过渡。',
    wtgGtomTitle: 'GTOM (Gativus 心智理论)',
    wtgGtomDesc: '定义意识架构和机制的奠基性理论。',
    wtgGnetTitle: 'GNET (Gativus 网络)',
    wtgGnetDesc: '网络拓扑规范，严格按照 GTOM 原则描述物理网络结构。',
    wtgGateTitle: 'GATE (Gativus 边缘设备)',
    wtgGateDesc: '旨在托管 GNET 网络节点的物理硬件和运行时环境。',
    neuronHero: '首页',
    neuronPillars: '支柱',
    neuronManifest: '概述',
    neuronAbout: '架构',
    neuronWiki: '百科',
    neuronCta: '加入',
  },
}

export function landingUiForLang(lang: string): LandingUiStrings {
  if (lang === 'ru')
    return uiDict.ru
  if (lang === 'zh')
    return uiDict.zh
  return uiDict.en
}
