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
      color: colorMode.value === 'dark' ? '#a1a1aa' : '#52525b',
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
      ticks: { color: colorMode.value === 'dark' ? '#a1a1aa' : '#52525b' },
      grid: { display: false },
    },
    y: {
      title: {
        display: true,
        text: 'Минуты',
        color: '#71717a',
        font: { size: 11, weight: 500 },
      },
      ticks: {
        color: colorMode.value === 'dark' ? '#a1a1aa' : '#52525b',
      },
      grid: {
        color: colorMode.value === 'dark' ? 'rgba(63,63,70,0.35)' : 'rgba(228,228,231,0.85)',
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
  <div class="profile-page gv-page">
    <section class="about-hero">
      <div class="hero-title-container">
        <img src="/images/121px-Logo.jpg" alt="Gativus" class="hero-logo">
        <div class="hero-text">
          <h1 class="hero-title gv-hero-gradient uppercase">
            Профиль
          </h1>
          <p class="hero-subtitle">
            Gativus — личный кабинет
          </p>
        </div>
      </div>
      <p class="hero-description">
        Данные аккаунта на сервере; время на сайте и закладка главы хранятся только в этом браузере.
      </p>
    </section>

    <div class="profile-grid pb-14">
      <section class="gv-surface-card overflow-hidden profile-span-full">
        <div class="gv-card-header flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-3">
            <span class="profile-eyebrow-badge">Активность</span>
            <h2 class="profile-card-heading">
              Время на сайте
            </h2>
          </div>
          <p class="profile-summary-stat m-0 text-sm">
            Всего: <strong>{{ totalPresenceLabel }}</strong>
          </p>
        </div>
        <div class="profile-card-body profile-card-body--chart">
          <Bar :data="chartData" :options="chartOptions" class="profile-chart" />
        </div>
      </section>

      <theAdministration class="profile-span-full" />

      <section class="gv-surface-card overflow-hidden">
        <div class="gv-card-header flex flex-wrap items-center gap-3">
          <span class="profile-book-badge">Книга</span>
          <h2 class="profile-card-heading">
            Продолжить чтение
          </h2>
        </div>
        <div class="profile-card-body">
          <template v-if="progress">
            <p class="profile-reading-book m-0">
              {{ progress.bookTitle || progress.bookSlug }}
            </p>
            <p class="profile-reading-chapter m-0">
              <span v-if="progress.sortOrder != null" class="profile-chapter-num">Глава {{ progress.sortOrder }}</span>
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
            <p v-if="progressUpdatedLabel" class="profile-reading-meta m-0">
              Сохранено: {{ progressUpdatedLabel }}
            </p>
          </template>
          <p v-else class="profile-reading-empty m-0">
            Откройте любую главу из книги — мы запомним, на чём вы остановились (в этом браузере).
          </p>
        </div>
      </section>

      <section class="gv-surface-card overflow-hidden">
        <div class="gv-card-header">
          <span class="profile-eyebrow-badge profile-eyebrow-badge--muted">Аккаунт</span>
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
            <div class="profile-field">
              <dt class="profile-dt">
                Роль
              </dt>
              <dd class="profile-dd">
                <span class="profile-role-pill">{{ roleLabel }}</span>
                <span class="profile-role-hint">{{ user?.role }}</span>
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
            Смена email и пароля пока недоступна из интерфейса — обратитесь к администратору.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Как на about.vue: hero + внешняя сетка страницы */
.profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px 10px 0;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
}

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
}

.hero-subtitle {
  margin: 8px 0 0;
  font-size: 15px;
  color: #777;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 400;
}

.hero-description {
  max-width: 680px;
  font-size: 16px;
  line-height: 1.7;
  color: #555;
  margin: 0;
}

.dark .hero-subtitle {
  color: #999;
}

.dark .hero-description {
  color: #bbb;
}

.dark .hero-title {
  color: #e5e5e5;
  border-bottom-color: #555;
  background: linear-gradient(135deg, #7dd3fc, #38bdf8, #0ea5e9, #7dd3fc);
  background-size: 300% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.profile-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
  width: 100%;
  align-self: stretch;
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
  margin-top: 6px;
}

.profile-card-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-card-body--chart {
  padding-bottom: 16px;
}

.profile-chart {
  height: 260px;
  width: 100%;
}

.profile-eyebrow-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: linear-gradient(90deg, #e0f2fe, #bae6fd);
  color: #0c4a6e;
}

.dark .profile-eyebrow-badge {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  color: #e0f2fe;
}

.profile-eyebrow-badge--muted {
  background: color-mix(in srgb, var(--gv-primary) 14%, var(--gv-surface-header));
  color: var(--gv-primary);
}

.profile-book-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  background: color-mix(in srgb, #0ea5e9 16%, transparent);
  color: #0369a1;
  border: 1px solid color-mix(in srgb, #0ea5e9 35%, transparent);
}

.dark .profile-book-badge {
  color: #7dd3fc;
  border-color: color-mix(in srgb, #0ea5e9 45%, transparent);
  background: color-mix(in srgb, #0ea5e9 18%, #18181b);
}

.profile-summary-stat {
  color: var(--gv-text-secondary);
}

.profile-summary-stat strong {
  color: var(--gv-text-primary);
  font-weight: 700;
}

.profile-reading-book {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
}

.profile-reading-chapter {
  font-size: 17px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--gv-text-primary);
}

.profile-chapter-num {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #0ea5e9;
  margin-bottom: 4px;
}

.profile-reading-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  align-items: center;
}

.profile-reading-meta {
  font-size: 12px;
  color: var(--gv-text-secondary);
}

.profile-reading-empty {
  font-size: 14px;
  line-height: 1.6;
  color: var(--gv-text-secondary);
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gv-text-secondary);
  margin-bottom: 6px;
}

.profile-dd {
  margin: 0;
  font-size: 15px;
  color: var(--gv-text-primary);
  word-break: break-word;
  padding: 10px 12px;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface);
}

.profile-dd--multiline {
  line-height: 1.5;
}

.profile-role-pill {
  display: inline-block;
  font-weight: 600;
  margin-right: 8px;
}

.profile-role-hint {
  font-size: 12px;
  color: var(--gv-text-secondary);
  font-family: ui-monospace, monospace;
}

.profile-note {
  font-size: 13px;
  line-height: 1.45;
  color: var(--gv-text-secondary);
}

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

  .profile-page {
    gap: 20px;
  }
}
</style>
