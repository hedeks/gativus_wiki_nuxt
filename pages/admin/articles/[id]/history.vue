<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['auth']
})

const route = useRoute()
const store = userStore()
const toast = useToast()

const articleId = route.params.id as string

// Find article slug by ID
const { data: allArticlesData } = await useFetch('/api/articles', {
  query: { limit: 1000, published_only: 'false' },
  headers: store.getAuthHeader(),
})

const currentArticle = computed(() => {
  const items = (allArticlesData.value as any)?.items || []
  return items.find((a: any) => a.id === parseInt(articleId))
})

const slug = computed(() => currentArticle.value?.slug || '')

useHead({ title: computed(() => `История — ${currentArticle.value?.title || ''} — Gativus Admin`) })

// Fetch revisions
const { data: revisions, refresh } = await useFetch(
  () => `/api/articles/${slug.value}/revisions`,
  {
    headers: store.getAuthHeader(),
    immediate: !!slug.value,
  }
)

const revisionsList = computed(() => (revisions.value as any[]) || [])

// Selected revision for viewing
const selectedRevisionId = ref<number | null>(null)
const selectedRevisionHtml = ref('')
const isLoadingRevision = ref(false)

async function viewRevision(revId: number) {
  if (selectedRevisionId.value === revId) {
    selectedRevisionId.value = null
    selectedRevisionHtml.value = ''
    return
  }

  isLoadingRevision.value = true
  selectedRevisionId.value = revId

  try {
    const data = await $fetch<any>(`/api/articles/${slug.value}/revisions/${revId}`, {
      headers: store.getAuthHeader(),
    })
    selectedRevisionHtml.value = data.html_content || ''
  } catch {
    toast.add({ title: 'Ошибка загрузки ревизии', color: 'red' })
  }

  isLoadingRevision.value = false
}

// Revert
const isReverting = ref(false)
const revertTarget = ref<{ id: number; num: number } | null>(null)

async function confirmRevert() {
  if (!revertTarget.value || !slug.value) return
  isReverting.value = true

  try {
    const result = await $fetch<any>(`/api/articles/${slug.value}/revert`, {
      method: 'POST',
      headers: {
        ...store.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: { revision_id: revertTarget.value.id },
    })
    toast.add({ title: result.message, color: 'green' })
    revertTarget.value = null
    refresh()
  } catch (err: any) {
    toast.add({
      title: 'Ошибка отката',
      description: err?.data?.statusMessage || err.message,
      color: 'red'
    })
  }

  isReverting.value = false
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>

<template>
  <div class="history-page gv-admin-page">
    <div class="history-header gv-admin-head">
      <div class="history-header-left">
        <NuxtLink :to="`/admin/articles/${articleId}/edit`" class="back-btn">
          <UIcon name="i-heroicons-arrow-left" />
        </NuxtLink>
        <div>
          <p class="gv-admin-eyebrow">ADMIN</p>
          <h1 class="history-title">История ревизий</h1>
          <p class="history-subtitle">{{ currentArticle?.title || '' }}</p>
        </div>
      </div>
    </div>

    <div class="history-body">
      <!-- Revisions list -->
      <div class="revisions-list">
        <div
          v-for="rev in revisionsList"
          :key="rev.id"
          class="revision-card"
          :class="{ 'revision-card--active': selectedRevisionId === rev.id }"
          @click="viewRevision(rev.id)"
        >
          <div class="revision-num">v{{ rev.revision_num }}</div>
          <div class="revision-info">
            <span class="revision-date">{{ formatDate(rev.created_at) }}</span>
            <span v-if="rev.change_summary" class="revision-summary">{{ rev.change_summary }}</span>
            <span v-if="rev.created_by_login" class="revision-author">
              <UIcon name="i-heroicons-user" class="revision-author-icon" />
              {{ rev.created_by_login }}
            </span>
          </div>
          <div class="revision-actions">
            <button
              v-if="rev.revision_num !== revisionsList[0]?.revision_num"
              class="revert-btn"
              @click.stop="revertTarget = { id: rev.id, num: rev.revision_num }"
              title="Откатить к этой ревизии"
            >
              <UIcon name="i-heroicons-arrow-uturn-left" />
            </button>
            <span v-else class="current-badge">Текущая</span>
          </div>
        </div>

        <div v-if="revisionsList.length === 0" class="empty-state">
          <UIcon name="i-heroicons-clock" class="empty-icon" />
          <span>Нет ревизий</span>
        </div>
      </div>

      <!-- Preview pane -->
      <div class="revision-preview">
        <template v-if="selectedRevisionHtml">
          <div class="preview-header">
            <span class="preview-label">Ревизия v{{ revisionsList.find(r => r.id === selectedRevisionId)?.revision_num }}</span>
          </div>
          <div class="article-prose preview-content" v-html="selectedRevisionHtml" />
        </template>
        <div v-else class="preview-empty">
          <UIcon name="i-heroicons-document-magnifying-glass" class="preview-empty-icon" />
          <span>Выберите ревизию для просмотра</span>
        </div>
      </div>
    </div>

    <!-- Revert Modal -->
    <Teleport to="body">
      <div v-if="revertTarget" class="modal-overlay" @click.self="revertTarget = null">
        <div class="modal-card">
          <h3 class="modal-title">Откатить к ревизии v{{ revertTarget.num }}?</h3>
          <p class="modal-desc">
            Текущее содержимое будет заменено. Будет создана новая ревизия с пометкой «Откат».
          </p>
          <div class="modal-actions">
            <button class="modal-btn modal-btn--cancel" @click="revertTarget = null">Отмена</button>
            <button class="modal-btn modal-btn--confirm" @click="confirmRevert" :disabled="isReverting">
              <UIcon v-if="isReverting" name="i-heroicons-arrow-path" class="animate-spin" />
              <span>Откатить</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 120px);
}

.history-header {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  flex-shrink: 0;
  border: none;
}
.dark .history-header { border: none; }

.history-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  padding: 6px;
  border-radius: 8px;
  color: #888;
  transition: all 0.2s;
}
.back-btn:hover { background: #f3f4f6; color: #1a1a1a; }
.dark .back-btn:hover { background: #252528; color: #e5e5e5; }

.history-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}
.dark .history-title { color: #e5e5e5; }

.history-subtitle {
  font-size: 13px;
  color: #888;
  margin: 2px 0 0;
}

/* ─── Body ─── */
.history-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ─── Revisions List ─── */
.revisions-list {
  width: 340px;
  flex-shrink: 0;
  border-right: 1px solid #e5e7eb;
  overflow-y: auto;
  background: #fafafa;
}
.dark .revisions-list {
  background: #161618;
  border-right-color: #2a2a2e;
}

.revision-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f2;
  cursor: pointer;
  transition: background 0.15s;
}
.revision-card:hover { background: #f3f4f6; }
.dark .revision-card { border-bottom-color: #232326; }
.dark .revision-card:hover { background: #1e1e21; }

.revision-card--active {
  background: #eef2ff !important;
  border-left: 3px solid #6366f1;
}
.dark .revision-card--active {
  background: #1e1b4b !important;
  border-left-color: #818cf8;
}

.revision-num {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: #555;
  flex-shrink: 0;
}
.dark .revision-num { background: #2a2a2e; color: #aaa; }

.revision-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.revision-date { font-size: 13px; font-weight: 600; color: #1a1a1a; }
.dark .revision-date { color: #e5e5e5; }

.revision-summary {
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.revision-author {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #999;
}

.revision-author-icon { width: 12px; height: 12px; }

.revision-actions { flex-shrink: 0; }

.revert-btn {
  padding: 6px;
  border-radius: 6px;
  border: none;
  background: none;
  cursor: pointer;
  color: #888;
  transition: all 0.2s;
}
.revert-btn:hover { background: #fef2f2; color: #f59e0b; }
.dark .revert-btn:hover { background: #451a03; color: #fbbf24; }

.current-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  background: #ecfdf5;
  color: #059669;
  text-transform: uppercase;
}
.dark .current-badge { background: #064e3b; color: #34d399; }

/* ─── Preview ─── */
.revision-preview {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}
.dark .revision-preview { background: #111113; }

.preview-header {
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f2;
  background: #fafafa;
}
.dark .preview-header { background: #161618; border-bottom-color: #2a2a2e; }

.preview-label {
  font-size: 12px;
  font-weight: 700;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-content {
  padding: 24px 32px;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: #999;
}

.preview-empty-icon { width: 48px; height: 48px; }

/* ─── Empty ─── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: #999;
}
.empty-icon { width: 36px; height: 36px; }

/* ─── Modal ─── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.dark .modal-card { background: #1e1e21; }

.modal-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0 0 8px;
}
.dark .modal-title { color: #e5e5e5; }

.modal-desc { color: #888; font-size: 14px; margin: 0 0 20px; }

.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

.modal-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.2s;
}
.modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-btn--cancel { background: #f3f4f6; color: #555; }
.dark .modal-btn--cancel { background: #252528; color: #aaa; }
.modal-btn--confirm { background: #f59e0b; color: #fff; }
.modal-btn--confirm:hover { background: #d97706; }

@media (max-width: 768px) {
  .history-body { flex-direction: column; }
  .revisions-list { width: 100%; max-height: 300px; border-right: none; border-bottom: 1px solid #e5e7eb; }
  .dark .revisions-list { border-bottom-color: #2a2a2e; }
}
</style>
