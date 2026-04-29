<script setup lang="ts">
import type { Quiz } from '~/types'

const store = userStore()
const role = computed(() => store.userInfo?.role)

const { data, pending } = useFetch<Quiz[]>('/api/quiz')

const courses = computed(() => {
  const d = data.value
  if (!Array.isArray(d))
    return [] as Quiz[]
  return [...d].sort((a, b) => a.course_id - b.course_id)
})

const heading = computed(() =>
  role.value === 'admin' ? 'Администрирование' : 'Панель редактора',
)
</script>

<template>
  <section
    v-if="role === 'admin' || role === 'editor'"
    id="administration"
    class="gv-surface-card overflow-hidden"
  >
    <div class="gv-card-header flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-3">
        <span class="admin-eyebrow">Админ</span>
        <h2 class="admin-card-title">
          {{ heading }}
        </h2>
      </div>
      <p class="admin-card-sub m-0">
        Курсы (legacy API) и переход в панель контента.
      </p>
    </div>
    <div class="admin-card-body">
      <p class="admin-stat m-0">
        Курсов на сайте: {{ courses.length }}
      </p>
      <ul class="admin-course-list">
        <li
          v-for="course in courses"
          :key="course.course_id"
          class="admin-course-item"
        >
          <span class="admin-course-id">{{ course.course_id }}</span>
          {{ course.title }}
        </li>
      </ul>
      <GvButton
        icon="i-heroicons-arrow-right"
        trailing
        block
        color="sky"
        variant="solid"
        to="/admin"
        class="mt-1"
        label="Панель управления контентом"
        :loading="pending"
      />
    </div>
  </section>
</template>

<style scoped>
.admin-eyebrow {
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

.dark .admin-eyebrow {
  background: linear-gradient(90deg, #0c4a6e, #082f49);
  color: #e0f2fe;
}

.admin-card-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--gv-text-primary);
}

.admin-card-sub {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--gv-text-secondary);
}

.admin-card-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.admin-stat {
  font-size: 14px;
  font-weight: 600;
  color: var(--gv-text-primary);
}

.admin-course-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
}

.admin-course-item {
  font-size: 13px;
  line-height: 1.4;
  padding: 8px 10px;
  border-radius: var(--gv-radius-control);
  border: 1px solid var(--gv-border-principal);
  background: var(--gv-surface);
  color: var(--gv-text-primary);
  text-align: left;
}

.admin-course-id {
  display: inline-block;
  min-width: 2rem;
  font-size: 11px;
  font-weight: 700;
  color: var(--gv-text-secondary);
  font-variant-numeric: tabular-nums;
  margin-right: 8px;
}
</style>
