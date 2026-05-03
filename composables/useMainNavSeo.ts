import { useLanguageStore } from '~/stores/language'

/** Совпадает с пунктами `theHeader` (главная навигация сайта). */
export type MainNavSeoKey = 'home' | 'library' | 'articles' | 'glossary' | 'knowledge-graph'

type Lang = 'en' | 'ru' | 'zh'

interface NavSeoStrings {
  page: string
  description: string
}

const PACK: Record<Lang, Record<MainNavSeoKey, NavSeoStrings>> = {
  en: {
    home: {
      page: 'Home',
      description:
        'GATIVUS — GTOM · GNET · GATE: abstract theory, network protocol, and physical hardware.',
    },
    library: {
      page: 'Library',
      description: 'A collection of theoretical materials structured as interactive books.',
    },
    articles: {
      page: 'Articles',
      description: 'Architecture, fundamental principles, and Gativus methodology.',
    },
    glossary: {
      page: 'Glossary',
      description: 'Gativus system terms and definitions.',
    },
    'knowledge-graph': {
      page: 'Knowledge Graph',
      description: 'Visual map of terms and links across the wiki knowledge base.',
    },
  },
  ru: {
    home: {
      page: 'Главная',
      description:
        'GATIVUS — GTOM · GNET · GATE: абстрактная теория, сетевой протокол и физическое оборудование.',
    },
    library: {
      page: 'Библиотека',
      description: 'Собрание теоретических материалов, структурированных в виде интерактивных книг.',
    },
    articles: {
      page: 'Статьи',
      description: 'Архитектура, фундаментальные принципы и методология Gativus.',
    },
    glossary: {
      page: 'Глоссарий',
      description: 'Термины и определения систем Gativus.',
    },
    'knowledge-graph': {
      page: 'Граф знаний',
      description: 'Визуальная карта терминов и связей вики.',
    },
  },
  zh: {
    home: {
      page: '主页',
      description: 'GATIVUS — GTOM · GNET · GATE：理论、网络协议与硬件体系。',
    },
    library: {
      page: '图书馆',
      description: '以交互式书籍组织的理论资料库。',
    },
    articles: {
      page: '文章',
      description: '架构、基本原理与 Gativus 方法。',
    },
    glossary: {
      page: '词汇表',
      description: 'Gativus 系统术语与释义。',
    },
    'knowledge-graph': {
      page: '知识图谱',
      description: '知识库术语与关联的可视化图谱。',
    },
  },
}

/**
 * SEO для основных разделов из шапки: заголовок `Gativus — {подпись}`, описание по языку.
 */
export function useMainNavSeo(key: MainNavSeoKey) {
  const langStore = useLanguageStore()
  const strings = computed(() => {
    const raw = langStore.currentLang
    const lang: Lang = raw === 'ru' ? 'ru' : raw === 'zh' ? 'zh' : 'en'
    return PACK[lang][key]
  })
  const seoTitle = computed(() => `Gativus — ${strings.value.page}`)
  const seoDescription = computed(() => strings.value.description)
  useSeoMeta({
    title: seoTitle,
    ogTitle: seoTitle,
    description: seoDescription,
    ogDescription: seoDescription,
    ogImage: '/favicon.ico',
  })
}
