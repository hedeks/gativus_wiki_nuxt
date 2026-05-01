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

useHead({
  title: 'Профиль',
})

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const store = userStore()
const colorMode = useColorMode()
const { state: presenceState, last7DayKeys } = useSitePresence()
const { progress } = useReadingProgress()

const exploreLinks = [
  { to: '/books', label: 'Книги', icon: 'i-heroicons-book-open' },
  { to: '/articles', label: 'Статьи', icon: 'i-heroicons-document-text' },
  { to: '/glossary', label: 'Глоссарий', icon: 'i-heroicons-language' },
] as const

const profileHighlights = [
  {
    icon: 'i-heroicons-server-stack' as const,
    title: 'Данные аккаунта',
    text: 'Email, логин и роль приходят с сервера после входа.',
  },
  {
    icon: 'i-heroicons-clock' as const,
    title: 'Время на сайте',
    text: 'Считается локально: только в этом браузере и на этом устройстве.',
  },
  {
    icon: 'i-heroicons-bookmark' as const,
    title: 'Чтение',
    text: 'Последняя открытая глава книги сохраняется в памяти браузера.',
  },
]

const chartData = computed<ChartData<'bar'>>(() => {
  const days = last7DayKeys()
  const dark = colorMode.value === 'dark'
  const bar = dark
    ? {
        bg: 'rgba(14,165,233,0.38)',
        border: 'rgba(56,189,248,0.9)',
        hover: 'rgba(14,165,233,0.55)',
      }
    : {
        bg: 'rgba(2,132,199,0.22)',
        border: 'rgba(2,132,199,0.88)',
        hover: 'rgba(2,132,199,0.38)',
      }

  const minutes = days.map(({ key }) =>
    Math.round((presenceState.value.byDay[key] || 0) / 60),
  )

  return {
    labels: days.map(d => d.label),
    datasets: [
      {
        label: 'Минуты активной вкладки',
        backgroundColor: bar.bg,
        hoverBackgroundColor: bar.hover,
        borderColor: bar.border,
        hoverBorderColor: bar.border,
        borderWidth: 1,
        data: minutes,
        borderRadius: 6,
      },
    ],
  }
})

const chartTickMuted = computed(() =>
  colorMode.value === 'dark' ? '#a1a1aa' : '#52525b',
)

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'Последние 7 дней',
      color: chartTickMuted.value,
      font: { size: 12, weight: 600 },
    },
    tooltip: {
      callbacks: {
        label: (ctx: { raw: unknown }) => `${ctx.raw} мин`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: chartTickMuted.value },
      grid: { display: false },
    },
    y: {
      title: {
        display: true,
        text: 'Минуты',
        color: chartTickMuted.value,
        font: { size: 11, weight: 500 },
      },
      ticks: {
        color: chartTickMuted.value,
      },
      grid: {
        color:
          colorMode.value === 'dark'
            ? 'rgba(63,63,70,0.35)'
            : 'rgba(228,228,231,0.85)',
      },
      beginAtZero: true,
    },
  },
}))

const totalPresenceLabel = computed(() => {
  const sec = presenceState.value.totalSeconds
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (sec < 60)
    return 'меньше минуты'
  if (h > 0)
    return `${h} ч ${m} мин`
  return `${m} мин`
})

const progressUpdatedLabel = computed(() => {
  const raw = progress.value?.updatedAt
  if (!raw)
    return ''
  return new Date(raw).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Администратор',
  editor: 'Редактор',
  user: 'Читатель',
}

const ROLE_COPY: Record<User['role'], string> = {
  admin: 'Полный доступ к админ-панели, пользователям и контенту.',
  editor: 'Создание и правка статей, книг, глоссария и категорий.',
  user: 'Просмотр базы знаний и личный профиль.',
}

const dateFmt: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

const user = computed(() => store.userInfo)

const createdLabel = computed(() => {
  const raw = user.value?.created_at
  if (!raw)
    return '—'
  return new Date(raw).toLocaleDateString('ru-RU', dateFmt)
})

const lastVisitedLabel = computed(() => {
  const raw = user.value?.last_visited
  if (!raw)
    return null
  return new Date(raw).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const uuidShort = computed(() => {
  const u = user.value?.uuid
  if (!u)
    return '—'
  const flat = u.replace(/-/g, '')
  return `${flat.slice(0, 8)}…${flat.slice(-4)}`
})

const roleDescription = computed(() => {
  const r = user.value?.role
  if (!r)
    return '—'
  return ROLE_COPY[r] ?? '—'
})

const roleLabel = computed(() => {
  const r = user.value?.role
  if (!r)
    return '—'
  return ROLE_LABEL[r] ?? r
})
</script>

<template>
  <div class="gv-page profile-page">
    <PageHero crisp class="profile-hero w-full">
      <template #default>
        <div class="hero-title-container">
          <img
            src="/images/121px-Logo.jpg"
            alt=""
            width="72"
            height="72"
            class="hero-logo"
          >
          <div class="hero-text">
            <p class="gv-hero-subtitle profile-hero-eyebrow-inline">
              Личный кабинет
            </p>
            <h1 class="hero-title gv-hero-gradient uppercase profile-hero-heading">
              Профиль
            </h1>
            <p class="profile-hero-tagline">
              Аккаунт, локальная активность и закладка чтения в одном месте
            </p>
          </div>
        </div>
        <ul class="profile-highlights" aria-label="Что отображается в кабинете">
          <li
            v-for="(item, idx) in profileHighlights"
            :key="idx"
            class="profile-highlight"
          >
            <span class="profile-highlight-icon" aria-hidden="true">
              <UIcon :name="item.icon" class="h-5 w-5" />
            </span>
            <div class="profile-highlight-text">
              <span class="profile-highlight-title">{{ item.title }}</span>
              <span class="profile-highlight-desc">{{ item.text }}</span>
            </div>
          </li>
        </ul>
        <nav
          class="profile-hero-nav"
          aria-label="Быстрый переход по разделам вики"
        >
          <GvButton
            v-for="link in exploreLinks"
            :key="link.to"
            :to="link.to"
            variant="outline"
            color="gray"
            size="sm"
            :icon="link.icon"
          >
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
              <span class="profile-badge profile-badge--accent">Активность</span>
              <h2 class="profile-card-heading">
                Время на сайте
              </h2>
            </div>
            <p class="profile-card-sub m-0">
              Пока вкладка активна (не свёрнута и страница в фокусе), время суммируется по календарным дням в вашей таймзоне.
            </p>
          </div>
          <p class="profile-summary-stat m-0 shrink-0 text-sm sm:text-right">
            Всего: <strong>{{ totalPresenceLabel }}</strong>
          </p>
        </div>
        <div class="profile-card-body profile-card-body--chart">
          <Bar :data="chartData" :options="chartOptions" class="profile-chart" />
        </div>
      </section>

      <theAdministration class="profile-span-full" />

      <section class="gv-surface-card overflow-hidden">
        <div class="gv-card-header">
          <span class="profile-badge profile-badge--muted">Аккаунт</span>
          <h2 class="profile-card-heading profile-card-heading--stacked">
            О вас
          </h2>
        </div>
        <div class="profile-card-body">
          <dl class="profile-fields">
            <div class="profile-field">
              <dt class="profile-dt">
                Email
              </dt>
              <dd class="profile-dd">
                {{ user?.email ?? '—' }}
              </dd>
            </div>
            <div class="profile-field">
              <dt class="profile-dt">
                Логин
              </dt>
              <dd class="profile-dd">
                {{ user?.login ?? '—' }}
              </dd>
            </div>
            <div class="profile-field">
              <dt class="profile-dt">
                Дата регистрации
              </dt>
              <dd class="profile-dd">
                {{ createdLabel }}
              </dd>
            </div>
            <div
              v-if="lastVisitedLabel"
              class="profile-field"
            >
              <dt class="profile-dt">
                Последний визит
              </dt>
              <dd class="profile-dd">
                {{ lastVisitedLabel }}
              </dd>
            </div>
            <div class="profile-field profile-field--full">
              <dt class="profile-dt">
                Внутренний идентификатор
              </dt>
              <dd
                class="profile-dd profile-dd--mono"
                :title="user?.uuid ?? undefined"
              >
                {{ uuidShort }}
              </dd>
            </div>
            <div class="profile-field profile-field--full">
              <dt class="profile-dt">
                Роль
              </dt>
              <dd class="profile-dd profile-dd--multiline">
                <span class="profile-role-pill">{{ roleLabel }}</span>
                <span class="sr-only">Техническое значение: {{ user?.role }}</span>
              </dd>
            </div>
            <div class="profile-field profile-field--full">
              <dt class="profile-dt">
                Возможности
              </dt>
              <dd class="profile-dd profile-dd--multiline">
                {{ roleDescription }}
              </dd>
            </div>
          </dl>
          <p class="profile-note m-0">
            Смена email и пароля из интерфейса пока не поддерживается — напишите администратору, если нужно обновить данные.
          </p>
        </div>
      </section>

      <section class="gv-surface-card overflow-hidden">
        <div class="gv-card-header space-y-1">
          <div class="flex flex-wrap items-center gap-3">
            <span class="profile-badge profile-badge--book">Чтение</span>
            <h2 class="profile-card-heading">
              Продолжить чтение
            </h2>
          </div>
          <p class="profile-card-sub m-0">
            Закладка обновляется, когда вы открываете главу из книги.
          </p>
        </div>
        <div class="profile-card-body">
          <template v-if="progress">
            <p class="profile-reading-book m-0">
              {{ progress.bookTitle || progress.bookSlug }}
            </p>
            <p class="profile-reading-chapter m-0">
              <span
                v-if="progress.sortOrder != null"
                class="profile-chapter-num"
              >Глава {{ progress.sortOrder }}</span>
              {{ progress.articleTitle }}
            </p>
            <div class="profile-reading-actions">
              <GvButton
                :to="`/books/${progress.bookSlug}`"
                variant="outline"
                color="gray"
                icon="i-heroicons-book-open"
              >
                К книге
              </GvButton>
              <GvButton
                :to="`/articles/${progress.articleSlug}`"
                variant="solid"
                color="sky"
                trailing
                icon="i-heroicons-arrow-right"
              >
                Открыть главу
              </GvButton>
            </div>
            <p
              v-if="progressUpdatedLabel"
              class="profile-reading-meta m-0"
            >
              Сохранено: {{ progressUpdatedLabel }}
            </p>
          </template>
          <p
            v-else
            class="profile-reading-empty m-0"
          >
            Откройте любую главу из книги — мы запомним место остановки в этом браузере. Обзор всех книг в
            <NuxtLink to="/books" class="profile-inline-link">
              каталоге
            </NuxtLink>.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding-bottom: 3.5rem;
}

.profile-hero-eyebrow-inline {
  margin: 0 0 0.5rem;
}

.profile-hero-heading {
  border-bottom: 1px solid var(--gv-border-principal);
  margin-bottom: 0 !important;
  padding-bottom: 0.5rem;
}

.profile-hero-tagline {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.profile-hero-lead {
  max-width: 40rem;
}

.profile-highlights {
  list-style: none;
  margin: 2rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
  width: 100%;
  max-width: 44rem;
}

@media (min-width: 640px) {
  .profile-highlights {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.profile-highlight {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  text-align: left;
  padding: 0.875rem 1rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: color-mix(in srgb, var(--gv-surface) 92%, var(--gv-primary) 8%);
  box-shadow: var(--gv-shadow-sm);
}

.dark .profile-highlight {
  background: color-mix(in srgb, var(--gv-surface-card) 94%, var(--gv-primary) 6%);
}

.profile-highlight-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  color: var(--gv-primary);
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-card));
}

.profile-highlight-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.profile-highlight-title {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--gv-text-primary);
}

.profile-highlight-desc {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--gv-text-secondary);
}

.profile-hero-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1.75rem;
}

/* Hero layout (как на about, внутри PageHero) */
.hero-title-container {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}

.hero-logo {
  height: 72px;
  width: auto;
  border-radius: var(--gv-radius-control);
  box-shadow: var(--gv-shadow-sm);
}

.hero-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

@media (max-width: 640px) {
  .hero-title-container {
    flex-direction: column;
    text-align: center;
  }

  .hero-text {
    align-items: center;
    text-align: center;
  }
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

.profile-card-heading {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--gv-text-primary);
}

.profile-card-heading--stacked {
  margin-top: 0.375rem;
}

.profile-card-sub {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: var(--gv-text-secondary);
  max-width: 42rem;
}

.profile-card-body {
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-card-body--chart {
  padding-bottom: 1rem;
}

.profile-chart {
  height: 260px;
  width: 100%;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.profile-badge--accent {
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-header));
  color: var(--gv-primary);
  border: 1px solid color-mix(in srgb, var(--gv-primary) 28%, var(--gv-border-principal));
}

.profile-badge--muted {
  background: color-mix(in srgb, var(--gv-text-secondary) 8%, var(--gv-surface-header));
  color: var(--gv-text-secondary);
  border: 1px solid var(--gv-border-principal);
}

.profile-badge--book {
  background: color-mix(in srgb, var(--gv-primary) 12%, var(--gv-surface-header));
  color: var(--gv-primary);
  border: 1px solid color-mix(in srgb, var(--gv-primary) 32%, var(--gv-border-principal));
}

.profile-summary-stat {
  color: var(--gv-text-secondary);
}

.profile-summary-stat strong {
  color: var(--gv-text-primary);
  font-weight: 700;
}

.profile-reading-book {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.profile-reading-chapter {
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--gv-text-primary);
}

.profile-chapter-num {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--gv-primary);
  margin-bottom: 0.25rem;
}

.profile-reading-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: 0.25rem;
  align-items: center;
}

.profile-reading-meta {
  font-size: 0.75rem;
  color: var(--gv-text-secondary);
}

.profile-reading-empty {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--gv-text-secondary);
}

.profile-inline-link {
  color: var(--gv-primary);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.profile-inline-link:hover {
  color: var(--gv-primary-hover);
}

.profile-fields {
  margin: 0;
  display: grid;
  gap: 1rem;
}

@media (min-width: 640px) {
  .profile-fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.profile-field {
  margin: 0;
}

.profile-field--full {
  grid-column: 1 / -1;
}

.profile-dt {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  margin-bottom: 0.375rem;
}

.profile-dd {
  margin: 0;
  font-size: 0.9375rem;
  color: var(--gv-text-primary);
  word-break: break-word;
  padding: 0.625rem 0.75rem;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface);
}

.profile-dd--multiline {
  line-height: 1.5;
}

.profile-dd--mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8125rem;
}

.profile-role-pill {
  display: inline-block;
  font-weight: 600;
}

.profile-note {
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--gv-text-secondary);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
