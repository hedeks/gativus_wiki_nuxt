<script setup lang="ts">
import type { ChartData } from 'chart.js'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import type { User } from '~/types'

definePageMeta({
  layout: 'default',
  middleware: 'auth',
})

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const store = userStore()
const colorMode = useColorMode()
import { useLanguageStore } from '~/stores/language'
const langStore = useLanguageStore()
const { state: presenceState, last7DayKeys } = useSitePresence()
import { useReadingProgress } from '~/composables/useReadingProgress'
const { hydrate, mergeWithServer } = useReadingProgress()

onMounted(() => {
  hydrate()
})

const { data: profileData, pending: profilePending } = useLazyFetch('/api/user/profile', {
  headers: useRequestHeaders(['cookie', 'authorization'])
})

const uiDict = {
  en: {
    title: 'Profile',
    subtitle: 'Dashboard',
    tagline: 'Account, global activity, and reading bookmark in one place',
    highlight1: { title: 'Account Data', text: 'Email, login, and role from the server.' },
    highlight2: { title: 'Time on site', text: 'Synchronized globally across your devices.' },
    highlight3: { title: 'Reading', text: 'The last opened chapter of a book is saved.' },
    navBooks: 'Books',
    navArticles: 'Articles',
    navGlossary: 'Glossary',
    timeTitle: 'Time on site',
    timeDesc: 'While the tab is active, time is summarized globally.',
    timeTotal: 'Total:',
    chartTitle: 'Last 7 days (Local)',
    chartMins: 'minutes',
    chartMinLabel: 'Active tab minutes',
    lessThanMin: 'less than a minute',
    h: 'h',
    m: 'm',
    aboutYou: 'About you',
    email: 'Email',
    login: 'Login',
    registered: 'Registered',
    lastVis: 'Last visit',
    uuid: 'Internal ID',
    role: 'Role',
    caps: 'Capabilities',
    note: 'Password changing is not yet supported in the UI.',
    readTitle: 'Continue reading',
    readSub: 'Bookmarks are updated when you read chapters.',
    readBtn1: 'To book',
    readBtn2: 'Open chapter',
    readSaved: 'Saved:',
    readEmpty: 'Open any book chapter — we will remember where you stopped. View books in the catalog.',
    roles: {
      admin: 'Administrator',
      editor: 'Editor',
      user: 'Reader'
    },
    roleDescs: {
      admin: 'Full access to admin panel, users, and content.',
      editor: 'Can create and edit articles, books, glossary.',
      user: 'View the knowledge base and profile.'
    },
    chapter: 'Chapter',
    bookmarksTitle: 'Bookmarks',
    bookmarksSub: 'Your saved articles.',
    bookmarksEmpty: 'No bookmarks yet.',
    statsTitle: 'Contribution',
    statsSub: 'Your activity as an editor.',
    statsArticles: 'Authored articles',
    statsTerms: 'Authored terms',
  },
  ru: {
    title: 'Профиль',
    subtitle: 'Личный кабинет',
    tagline: 'Аккаунт, глобальная активность и закладка чтения в одном месте',
    highlight1: { title: 'Данные аккаунта', text: 'Email, логин и роль приходят с сервера.' },
    highlight2: { title: 'Время на сайте', text: 'Синхронизируется глобально между устройствами.' },
    highlight3: { title: 'Чтение', text: 'Последняя открытая глава книги сохраняется в профиле.' },
    navBooks: 'Книги',
    navArticles: 'Статьи',
    navGlossary: 'Глоссарий',
    timeTitle: 'Время на сайте',
    timeDesc: 'Пока вкладка активна, время суммируется на вашем аккаунте.',
    timeTotal: 'Всего:',
    chartTitle: 'Последние 7 дней (Локально)',
    chartMins: 'минут',
    chartMinLabel: 'Минуты активной вкладки',
    lessThanMin: 'меньше минуты',
    h: 'ч',
    m: 'мин',
    aboutYou: 'О вас',
    email: 'Email',
    login: 'Логин',
    registered: 'Дата регистрации',
    lastVis: 'Последний визит',
    uuid: 'Внутренний ID',
    role: 'Роль',
    caps: 'Возможности',
    note: 'Смена пароля пока недоступна в интерфейсе.',
    readTitle: 'Продолжить чтение',
    readSub: 'Закладка обновляется при чтении глав.',
    readBtn1: 'К книге',
    readBtn2: 'Открыть главу',
    readSaved: 'Сохранено:',
    readEmpty: 'Откройте любую главу — мы запомним место. Обзор книг в каталоге.',
    roles: {
      admin: 'Администратор',
      editor: 'Редактор',
      user: 'Читатель'
    },
    roleDescs: {
      admin: 'Полный доступ к админке и контенту.',
      editor: 'Создание и правка статей и глоссария.',
      user: 'Просмотр базы знаний и профиля.'
    },
    chapter: 'Глава',
    bookmarksTitle: 'Закладки',
    bookmarksSub: 'Ваши сохранённые статьи.',
    bookmarksEmpty: 'Нет сохранённых закладок.',
    statsTitle: 'Вклад',
    statsSub: 'Ваша активность как редактора.',
    statsArticles: 'Написано статей',
    statsTerms: 'Написано терминов',
  },
  zh: {
    title: '个人资料',
    subtitle: '仪表板',
    tagline: '账户、全局活动和阅读书签',
    highlight1: { title: '账户数据', text: '电子邮件，登录名和角色。' },
    highlight2: { title: '在站时间', text: '在您的设备上全局同步。' },
    highlight3: { title: '阅读', text: '书籍的最后打开的章节已保存。' },
    navBooks: '图书',
    navArticles: '文章',
    navGlossary: '词汇表',
    timeTitle: '在站时间',
    timeDesc: '当标签处于活动状态时，时间将在您的账户中全局累加。',
    timeTotal: '总计:',
    chartTitle: '过去7天 (本地)',
    chartMins: '分钟',
    chartMinLabel: '活动标签分钟数',
    lessThanMin: '不到一分钟',
    h: '小时',
    m: '分钟',
    aboutYou: '关于你',
    email: '电子邮件',
    login: '登录名',
    registered: '注册时间',
    lastVis: '最后访问',
    uuid: '内部ID',
    role: '角色',
    caps: '能力',
    note: '界面中尚不支持更改密码。',
    readTitle: '继续阅读',
    readSub: '书签在阅读时更新。',
    readBtn1: '去书本',
    readBtn2: '打开章节',
    readSaved: '已保存:',
    readEmpty: '打开任何书籍章节 — 我们会记住您的进度。在目录中查看书籍。',
    roles: {
      admin: '管理员',
      editor: '编辑',
      user: '读者'
    },
    roleDescs: {
      admin: '完全访问管理面板和内容。',
      editor: '可以创建和编辑文章和词汇表。',
      user: '查看知识库和个人资料。'
    },
    chapter: '章节',
    bookmarksTitle: '书签',
    bookmarksSub: '您保存的文章。',
    bookmarksEmpty: '暂无书签。',
    statsTitle: '贡献',
    statsSub: '您作为编辑的活动。',
    statsArticles: '撰写的文章',
    statsTerms: '撰写的词条',
  }
}

const t = computed(() => uiDict[langStore.currentLang as keyof typeof uiDict] || uiDict.en)

useHead({
  title: computed(() => t.value.title),
})

const exploreLinks = computed(() => [
  { to: '/books', label: t.value.navBooks, icon: 'i-heroicons-book-open' },
  { to: '/articles', label: t.value.navArticles, icon: 'i-heroicons-document-text' },
  { to: '/glossary', label: t.value.navGlossary, icon: 'i-heroicons-language' },
])

const profileHighlights = computed(() => [
  { icon: 'i-heroicons-server-stack', title: t.value.highlight1.title, text: t.value.highlight1.text },
  { icon: 'i-heroicons-clock', title: t.value.highlight2.title, text: t.value.highlight2.text },
  { icon: 'i-heroicons-bookmark', title: t.value.highlight3.title, text: t.value.highlight3.text },
])

const chartData = computed<ChartData<'bar'>>(() => {
  const days = last7DayKeys()
  const dark = colorMode.value === 'dark'
  const bar = dark
    ? { bg: 'rgba(14,165,233,0.38)', border: 'rgba(56,189,248,0.9)', hover: 'rgba(14,165,233,0.55)' }
    : { bg: 'rgba(2,132,199,0.22)', border: 'rgba(2,132,199,0.88)', hover: 'rgba(2,132,199,0.38)' }

  const minutes = days.map(({ key }) => Math.round((presenceState.value.byDay[key] || 0) / 60))

  return {
    labels: days.map(d => d.label),
    datasets: [{
      label: t.value.chartMinLabel,
      backgroundColor: bar.bg,
      hoverBackgroundColor: bar.hover,
      borderColor: bar.border,
      hoverBorderColor: bar.border,
      borderWidth: 1,
      data: minutes,
      borderRadius: 6,
    }],
  }
})

const chartTickMuted = computed(() => colorMode.value === 'dark' ? '#a1a1aa' : '#52525b')

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    title: {
      display: true,
      text: t.value.chartTitle,
      color: chartTickMuted.value,
      font: { size: 12, weight: 600 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => `${ctx.raw} ${t.value.chartMins}`,
      },
    },
  },
  scales: {
    x: { ticks: { color: chartTickMuted.value }, grid: { display: false } },
    y: {
      title: {
        display: true,
        text: t.value.chartMins,
        color: chartTickMuted.value,
        font: { size: 11, weight: 500 },
      },
      ticks: { color: chartTickMuted.value },
      grid: { color: colorMode.value === 'dark' ? 'rgba(63,63,70,0.35)' : 'rgba(228,228,231,0.85)' },
      beginAtZero: true,
    },
  },
}))

const totalPresenceLabel = computed(() => {
  const sec = profileData.value?.time_on_site_seconds || 0
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (sec < 60) return t.value.lessThanMin
  if (h > 0) return `${h} ${t.value.h} ${m} ${t.value.m}`
  return `${m} ${t.value.m}`
})

const user = computed(() => store.userInfo)

function formatDate(raw: string | undefined | null) {
  if (!raw) return '—'
  return new Date(raw).toLocaleString(langStore.currentLang === 'ru' ? 'ru-RU' : (langStore.currentLang === 'zh' ? 'zh-CN' : 'en-US'), {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const createdLabel = computed(() => {
  const raw = user.value?.created_at
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString(langStore.currentLang === 'ru' ? 'ru-RU' : (langStore.currentLang === 'zh' ? 'zh-CN' : 'en-US'), {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

const lastVisitedLabel = computed(() => formatDate(user.value?.last_visited))

const uuidShort = computed(() => {
  const u = user.value?.uuid
  if (!u) return '—'
  const flat = u.replace(/-/g, '')
  return `${flat.slice(0, 8)}…${flat.slice(-4)}`
})

const roleDescription = computed(() => {
  const r = user.value?.role
  if (!r) return '—'
  return t.value.roleDescs[r as keyof typeof t.value.roleDescs] ?? '—'
})

const roleLabel = computed(() => {
  const r = user.value?.role
  if (!r) return '—'
  return t.value.roles[r as keyof typeof t.value.roles] ?? r
})

const readingProgress = computed(() => {
  const progress = mergeWithServer(profileData.value?.reading_progress) || []
  return progress.filter(p => (p.progress_percent || 0) < 95).slice(0, 3)
})

const getTitle = (item: any) => item[`title_${langStore.currentLang}`] || item.title || item.article_title
const getBookTitle = (item: any) => item[`book_title_${langStore.currentLang}`] || item.book_title || item.book_slug
</script>

<template>
  <div class="gv-page profile-page">
    <PageHero crisp class="profile-hero w-full">
      <template #default>
        <div class="hero-title-container">
          <img src="/images/121px-Logo.jpg" alt="" width="72" height="72" class="hero-logo">
          <div class="hero-text">
            <p class="gv-hero-subtitle profile-hero-eyebrow-inline">{{ t.subtitle }}</p>
            <h1 class="hero-title gv-hero-gradient uppercase profile-hero-heading">{{ t.title }}</h1>
            <p class="profile-hero-tagline">{{ t.tagline }}</p>
          </div>
        </div>
        <ul class="profile-highlights" aria-label="Highlights">
          <li v-for="(item, idx) in profileHighlights" :key="idx" class="profile-highlight">
            <span class="profile-highlight-icon" aria-hidden="true"><UIcon :name="item.icon" class="h-5 w-5" /></span>
            <div class="profile-highlight-text">
              <span class="profile-highlight-title">{{ item.title }}</span>
              <span class="profile-highlight-desc">{{ item.text }}</span>
            </div>
          </li>
        </ul>
        <nav class="profile-hero-nav" aria-label="Explore">
          <GvButton v-for="link in exploreLinks" :key="link.to" :to="link.to" variant="outline" color="gray" size="sm" :icon="link.icon">
            {{ link.label }}
          </GvButton>
        </nav>
      </template>
    </PageHero>

    <div class="profile-grid">
      <section class="gv-surface-card overflow-hidden profile-span-full">
        <div class="gv-card-header flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-1">
            <div class="flex flex-wrap items-center gap-3">
              <span class="profile-badge profile-badge--accent">{{ t.timeTitle }}</span>
              <h2 class="profile-card-heading">{{ t.timeTitle }}</h2>
            </div>
            <p class="profile-card-sub m-0">{{ t.timeDesc }}</p>
          </div>
          <p class="profile-summary-stat m-0 shrink-0 text-sm sm:text-right">
            {{ t.timeTotal }} <strong>{{ totalPresenceLabel }}</strong>
          </p>
        </div>
        <div class="profile-card-body profile-card-body--chart">
          <Bar :data="chartData" :options="chartOptions" class="profile-chart" />
        </div>
      </section>

      <theAdministration class="profile-span-full" />

      <section class="gv-surface-card overflow-hidden">
        <div class="gv-card-header">
          <span class="profile-badge profile-badge--muted">{{ t.aboutYou }}</span>
          <h2 class="profile-card-heading profile-card-heading--stacked">{{ t.aboutYou }}</h2>
        </div>
        <div class="profile-card-body">
          <dl class="profile-fields">
            <div class="profile-field"><dt class="profile-dt">{{ t.email }}</dt><dd class="profile-dd">{{ user?.email ?? '—' }}</dd></div>
            <div class="profile-field"><dt class="profile-dt">{{ t.login }}</dt><dd class="profile-dd">{{ user?.login ?? '—' }}</dd></div>
            <div class="profile-field"><dt class="profile-dt">{{ t.registered }}</dt><dd class="profile-dd">{{ createdLabel }}</dd></div>
            <div class="profile-field" v-if="lastVisitedLabel"><dt class="profile-dt">{{ t.lastVis }}</dt><dd class="profile-dd">{{ lastVisitedLabel }}</dd></div>
            <div class="profile-field profile-field--full"><dt class="profile-dt">{{ t.uuid }}</dt><dd class="profile-dd profile-dd--mono">{{ uuidShort }}</dd></div>
            <div class="profile-field profile-field--full"><dt class="profile-dt">{{ t.role }}</dt><dd class="profile-dd profile-dd--multiline"><span class="profile-role-pill">{{ roleLabel }}</span></dd></div>
            <div class="profile-field profile-field--full"><dt class="profile-dt">{{ t.caps }}</dt><dd class="profile-dd profile-dd--multiline">{{ roleDescription }}</dd></div>
          </dl>
          <p class="profile-note m-0">{{ t.note }}</p>
        </div>
      </section>

      <section class="gv-surface-card overflow-hidden" v-if="['editor', 'admin'].includes(user?.role || '')">
        <div class="gv-card-header">
          <span class="profile-badge profile-badge--accent">{{ t.statsTitle }}</span>
          <h2 class="profile-card-heading profile-card-heading--stacked">{{ t.statsTitle }}</h2>
          <p class="profile-card-sub m-0 mt-1">{{ t.statsSub }}</p>
        </div>
        <div class="profile-card-body">
          <dl class="profile-fields">
            <div class="profile-field">
              <dt class="profile-dt">{{ t.statsArticles }}</dt>
              <dd class="profile-dd font-bold text-lg text-[var(--gv-primary)]">{{ profileData?.stats?.authored_articles || 0 }}</dd>
            </div>
            <div class="profile-field">
              <dt class="profile-dt">{{ t.statsTerms }}</dt>
              <dd class="profile-dd font-bold text-lg text-[var(--gv-primary)]">{{ profileData?.stats?.authored_terms || 0 }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="gv-surface-card overflow-hidden profile-span-full">
        <div class="gv-card-header space-y-1">
          <div class="flex flex-wrap items-center gap-3">
            <span class="profile-badge profile-badge--book">{{ t.readTitle }}</span>
            <h2 class="profile-card-heading">{{ t.readTitle }}</h2>
          </div>
          <p class="profile-card-sub m-0">{{ t.readSub }}</p>
        </div>
        <div class="profile-card-body">
          <template v-if="readingProgress?.length">
            <div v-for="prog in readingProgress" :key="prog.book_slug" class="reading-progress-item mb-6 pb-6 border-b border-zinc-200/50 dark:border-zinc-800/50 last:border-0 last:pb-0 last:mb-0">
              <p class="profile-reading-book m-0">{{ getBookTitle(prog) }}</p>
              <p class="profile-reading-chapter m-0">
                <span v-if="prog.sort_order != null" class="profile-chapter-num">{{ t.chapter }} {{ prog.sort_order }}</span>
                {{ getTitle(prog) || prog.article_slug }}
              </p>
              <div v-if="prog.progress_percent != null" class="progress-track max-w-md">
                <div class="progress-fill" :style="{ width: prog.progress_percent + '%' }"></div>
              </div>
              <div class="profile-reading-actions mt-3">
                <GvButton :to="`/books/${prog.book_slug}`" variant="outline" color="gray" icon="i-heroicons-book-open" size="sm">
                  {{ t.readBtn1 }}
                </GvButton>
                <GvButton :to="`/articles/${prog.article_slug}${prog.anchor ? '#' + prog.anchor : ''}`" variant="solid" color="sky" trailing icon="i-heroicons-arrow-right" size="sm">
                  {{ t.readBtn2 }}
                </GvButton>
              </div>
              <p class="profile-reading-meta m-0 mt-2">{{ t.readSaved }} {{ formatDate(prog.updated_at) }}</p>
            </div>
          </template>
          <p v-else class="profile-reading-empty m-0">{{ t.readEmpty }}</p>
        </div>
      </section>
      
      <section class="gv-surface-card overflow-hidden profile-span-full">
        <div class="gv-card-header space-y-1">
          <div class="flex flex-wrap items-center gap-3">
            <span class="profile-badge profile-badge--accent">{{ t.bookmarksTitle }}</span>
            <h2 class="profile-card-heading">{{ t.bookmarksTitle }}</h2>
          </div>
          <p class="profile-card-sub m-0">{{ t.bookmarksSub }}</p>
        </div>
        <div class="profile-card-body">
          <template v-if="profileData?.bookmarks?.length">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <NuxtLink v-for="bm in profileData.bookmarks" :key="bm.id" :to="`/articles/${bm.slug}`" class="bookmark-card">
                <h3 class="bookmark-title">{{ getTitle(bm) }}</h3>
                <p class="bookmark-date">{{ formatDate(bm.created_at) }}</p>
              </NuxtLink>
            </div>
          </template>
          <p v-else class="profile-reading-empty m-0">{{ t.bookmarksEmpty }}</p>
        </div>
      </section>

    </div>
  </div>
</template>

<style scoped>
/* Luxe Profile Page Styles */
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding-bottom: 4rem;
  font-family: "Gill Sans", system-ui, -apple-system, sans-serif;
  background-image: radial-gradient(circle at 10% 0%, rgba(14, 165, 233, 0.05) 0%, transparent 40%),
                    radial-gradient(circle at 90% 20%, rgba(56, 189, 248, 0.05) 0%, transparent 40%);
}

.dark .profile-page {
  background-image: radial-gradient(circle at 10% 0%, rgba(14, 165, 233, 0.1) 0%, transparent 40%),
                    radial-gradient(circle at 90% 20%, rgba(56, 189, 248, 0.1) 0%, transparent 40%);
}

.hero-title-container {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  position: relative;
  z-index: 10;
}

.hero-logo {
  height: 80px;
  width: auto;
  border-radius: 1.25rem;
  box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.2), 0 8px 10px -6px rgba(14, 165, 233, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.dark .hero-logo {
  box-shadow: 0 10px 25px -5px rgba(14, 165, 233, 0.4), 0 8px 10px -6px rgba(14, 165, 233, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.hero-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.profile-hero-eyebrow-inline {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--gv-primary);
}

.profile-hero-heading {
  margin: 0;
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.profile-hero-tagline {
  margin: 0.5rem 0 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--gv-text-secondary);
}

.profile-highlights {
  list-style: none;
  margin: 2.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  width: 100%;
}

@media (min-width: 640px) {
  .profile-highlights { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

/* Glassmorphic Highlights */
.profile-highlight {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  text-align: left;
  padding: 1.25rem;
  border-radius: 1.25rem;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.025);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.profile-highlight:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.025);
}

.dark .profile-highlight {
  background: rgba(24, 24, 27, 0.6);
  border-color: rgba(255, 255, 255, 0.05);
}

.profile-highlight-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gv-primary) 20%, transparent);
}

.profile-highlight-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.profile-highlight-title {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--gv-text-primary);
}

.profile-highlight-desc {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

.profile-hero-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-start;
  margin-top: 2rem;
}

.profile-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
  width: 100%;
}

@media (min-width: 1024px) {
  .profile-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
  .profile-span-full {
    grid-column: 1 / -1;
  }
}

/* Glassmorphic Profile Cards */
.gv-surface-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 20px -5px rgba(0, 0, 0, 0.02);
  transition: box-shadow 0.3s ease;
}

.gv-surface-card:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 15px 30px -5px rgba(0, 0, 0, 0.04);
}

.dark .gv-surface-card {
  background: rgba(24, 24, 27, 0.75);
  border-color: rgba(255, 255, 255, 0.06);
}

.gv-card-header {
  padding: 1.5rem 1.5rem 0;
}

.profile-card-heading {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--gv-text-primary);
}

.profile-card-heading--stacked {
  margin-top: 0.5rem;
}

.profile-card-sub {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--gv-text-secondary);
  max-width: 42rem;
}

.profile-card-body {
  padding: 1.25rem 1.5rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.profile-chart {
  height: 280px;
  width: 100%;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.profile-badge--accent {
  background: linear-gradient(135deg, color-mix(in srgb, var(--gv-primary) 15%, transparent), color-mix(in srgb, var(--gv-primary) 5%, transparent));
  color: var(--gv-primary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gv-primary) 20%, transparent);
}

.profile-badge--muted {
  background: color-mix(in srgb, var(--gv-text-secondary) 8%, transparent);
  color: var(--gv-text-secondary);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gv-text-secondary) 15%, transparent);
}

.profile-badge--book {
  background: linear-gradient(135deg, color-mix(in srgb, #8b5cf6 15%, transparent), color-mix(in srgb, #6366f1 5%, transparent));
  color: #7c3aed;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #8b5cf6 20%, transparent);
}

.dark .profile-badge--book {
  color: #a78bfa;
}

.profile-summary-stat {
  color: var(--gv-text-secondary);
  background: rgba(0, 0, 0, 0.03);
  padding: 0.5rem 1rem;
  border-radius: 9999px;
}

.dark .profile-summary-stat {
  background: rgba(255, 255, 255, 0.05);
}

.profile-summary-stat strong {
  color: var(--gv-text-primary);
  font-weight: 800;
  font-size: 1.1em;
}

.profile-reading-book {
  font-size: 0.8125rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gv-primary);
}

.profile-reading-chapter {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1.4;
  color: var(--gv-text-primary);
  margin-top: 0.25rem;
}

.profile-chapter-num {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #8b5cf6;
  margin-right: 0.5rem;
  background: color-mix(in srgb, #8b5cf6 15%, transparent);
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  vertical-align: middle;
}

.dark .profile-chapter-num {
  color: #a78bfa;
}

.profile-reading-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
  align-items: center;
}

.profile-reading-meta {
  font-size: 0.75rem;
  color: var(--gv-text-secondary);
  font-weight: 500;
}

.profile-fields {
  margin: 0;
  display: grid;
  gap: 1.25rem;
}

@media (min-width: 640px) {
  .profile-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

.profile-field { margin: 0; }
.profile-field--full { grid-column: 1 / -1; }

.profile-dt {
  font-size: 0.6875rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  margin-bottom: 0.5rem;
}

.profile-dd {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--gv-text-primary);
  word-break: break-word;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 60%, transparent);
  background: color-mix(in srgb, var(--gv-surface) 60%, transparent);
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.02);
}

.dark .profile-dd {
  box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.2);
}

.profile-dd--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}

.profile-role-pill {
  display: inline-block;
  font-weight: 700;
  color: var(--gv-primary);
}

.profile-note {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gv-text-secondary);
}

/* Bookmark cards luxe */
.bookmark-card {
  display: block;
  padding: 1.25rem;
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 60%, transparent);
  background: color-mix(in srgb, var(--gv-surface) 60%, transparent);
  border-radius: 1rem;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.bookmark-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--gv-primary), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.bookmark-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.05);
  border-color: color-mix(in srgb, var(--gv-primary) 30%, transparent);
}

.bookmark-card:hover::before {
  opacity: 1;
}

.bookmark-title {
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--gv-text-primary);
  margin-bottom: 0.375rem;
  line-height: 1.4;
}

.bookmark-date {
  font-size: 0.75rem;
  color: var(--gv-text-secondary);
  font-weight: 500;
}

/* Custom animated gradient for reading progress */
.progress-track {
  width: 100%;
  background: color-mix(in srgb, var(--gv-text-secondary) 15%, transparent);
  border-radius: 9999px;
  height: 0.5rem;
  overflow: hidden;
  margin-top: 0.75rem;
  box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}

.progress-fill {
  height: 100%;
  border-radius: 9999px;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  position: relative;
  transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  animation: progress-shimmer 2s infinite linear;
}

@keyframes progress-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@media (max-width: 640px) {
  .hero-title-container { flex-direction: column; text-align: center; }
  .hero-text { align-items: center; text-align: center; }
  .profile-hero-nav { justify-content: center; }
  .gv-card-header { padding: 1.25rem 1.25rem 0; }
  .profile-card-body { padding: 1rem 1.25rem 1.25rem; }
}
</style>
