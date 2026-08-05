<template>
  <div :class="wrapperClass">
    <slot name="trigger" :open="openEditor">
      <!-- Main Floating Button -->
      <UTooltip text="Редактировать на лету" placement="left">
        <button 
          @click="openEditor"
          class="flex items-center justify-center w-16 h-16 rounded-full bg-sky-500/90 hover:bg-sky-500 text-white shadow-lg hover:shadow-sky-500/50 transition-all duration-300 hover:scale-105 active:scale-95 border border-white/20"
        >
          <UIcon name="i-heroicons-pencil-square-solid" class="w-7 h-7" />
        </button>
      </UTooltip>
    </slot>

    <!-- Slideover -->
    <USlideover v-model="isOpen" :ui="{ width: 'w-screen max-w-[95vw]', wrapper: '!z-[99999] in-place-editor-wrapper' }">
      <div class="flex-1 flex flex-col h-[100dvh] bg-white dark:bg-[#111113] relative overflow-hidden shadow-2xl border-l border-gray-200 dark:border-zinc-800">
        <!-- Header -->
        <div class="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-[#161618]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20">
              <UIcon name="i-heroicons-pencil-square" class="text-xl" />
            </div>
            <div>
              <h2 class="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Редактор</h2>
              <p class="text-[10px] text-gray-500 font-medium">In-place editing</p>
            </div>
          </div>
          <button @click="isOpen = false" class="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-200 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors">
            <UIcon name="i-heroicons-x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto min-h-0 gv-admin-scrollbar bg-white dark:bg-[#111113]">
          <!-- Suspense to handle async setup of forms -->
          <Suspense>
            <template #default>
              <div>
                <AdminArticleForm 
                  v-if="type === 'article' && isOpen" 
                  :article-id="id" 
                  @article-saved="handleSaved" 
                />
                <WorkspaceEditor 
                  v-else-if="type === 'term' && isOpen" 
                  :term-id="id" 
                  @term-created="handleSaved" 
                  @loading-change="isEditorLoading = $event"
                />
                <AdminBookForm
                  v-else-if="type === 'book' && isOpen"
                  :book-id="id"
                  @saved="handleSaved"
                />
              </div>
            </template>
            <template #fallback>
              <div class="flex items-center justify-center h-full min-h-[300px]">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500" />
              </div>
            </template>
          </Suspense>
        </div>
        
        <!-- Global Loader for WorkspaceEditor inner state -->
        <Transition name="fade">
          <div v-if="isEditorLoading" class="absolute inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-md">
             <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-sky-500" />
          </div>
        </Transition>
      </div>
    </USlideover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { userStore } from '~/stores/userStore'
import AdminArticleForm from '~/components/admin/AdminArticleForm.vue'
import WorkspaceEditor from '~/components/admin/WorkspaceEditor.vue'
import AdminBookForm from '~/components/admin/AdminBookForm.vue'

const props = withDefaults(defineProps<{
  type: 'article' | 'term' | 'book'
  id: number | string
  wrapperClass?: string
  modelValue?: boolean
}>(), {
  wrapperClass: 'hidden md:flex fixed bottom-6 right-6 z-50 group',
  modelValue: false
})

const emit = defineEmits<{
  (e: 'saved'): void
  (e: 'update:isOpen', value: boolean): void
  (e: 'update:modelValue', value: boolean): void
}>()

const store = userStore()
const isOpen = ref(false)
const isEditorLoading = ref(false)
const toast = useToast()

watch(() => props.modelValue, (val) => {
  if (val !== isOpen.value) {
    isOpen.value = val
  }
}, { immediate: true })

watch(isOpen, (val) => {
  emit('update:modelValue', val)
  emit('update:isOpen', val)
})

function openEditor() {
  isOpen.value = true
}

const canEdit = computed(() => {
  if (!store.isLoggedIn || !store.userInfo) return false
  const role = store.userInfo.role
  return role === 'editor' || role === 'admin'
})

function handleSaved() {
  isOpen.value = false
  emit('saved')
  toast.add({ title: 'Изменения сохранены', description: 'Страница была успешно обновлена.', color: 'green' })
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
