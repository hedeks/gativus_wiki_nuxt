<script setup lang="ts">
const props = defineProps<{
  category: any
  depth?: number
}>()

const emits = defineEmits(['delete', 'create-child', 'move-up', 'move-down'])

const d = computed(() => props.depth || 0)
const hasChildren = computed(() => props.category.children && props.category.children.length > 0)
const isOpen = ref(true)

const toggle = () => {
  if (hasChildren.value) {
    isOpen.value = !isOpen.value
  }
}
</script>

<template>
  <div class="category-item-wrap">
    <div 
      class="category-item" 
      :style="{ paddingLeft: (d * 24 + 12) + 'px' }"
      :class="{ 'has-children': hasChildren }"
    >
      <div class="item-main" @click="toggle">
        <UIcon 
          v-if="hasChildren" 
          :name="isOpen ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" 
          class="expand-icon"
        />
        <div v-else class="expand-spacer" />
        
        <UIcon :name="category.icon || 'i-heroicons-folder'" class="type-icon" :style="{ color: category.color }" />
        <span class="category-title">{{ category.title }}</span>
        <span class="category-slug text-gray-400 text-xs ml-2">/{{ category.slug }}</span>
      </div>

      <div class="item-actions">
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-up"
          @click="$emit('move-up', category)"
          title="Вверх"
        />
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-arrow-down"
          @click="$emit('move-down', category)"
          title="Вниз"
        />
        <UButton
          size="xs"
          color="red"
          variant="ghost"
          icon="i-heroicons-plus"
          @click="$emit('create-child', category.id)"
          title="Добавить подкатегорию"
        />
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          icon="i-heroicons-pencil-square"
          :to="`/admin/categories/${category.id}/edit`"
          title="Редактировать"
        />
        <UButton
          size="xs"
          color="red"
          variant="ghost"
          icon="i-heroicons-trash"
          @click="$emit('delete', category.id)"
          title="Удалить"
        />
      </div>
    </div>

    <div v-if="hasChildren && isOpen" class="children-list">
      <AdminCategoryItem
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :depth="d + 1"
        @delete="$emit('delete', $event)"
        @create-child="$emit('create-child', $event)"
        @move-up="$emit('move-up', $event)"
        @move-down="$emit('move-down', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #f3f4f6;
  transition: all 0.2s ease;
}
.dark .category-item {
  border-bottom-color: #2a2a2e;
}
.category-item:hover {
  background: #f9fafb;
}
.dark .category-item:hover {
  background: #252528;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  cursor: pointer;
}

.expand-icon {
  width: 16px;
  height: 16px;
  color: #888;
}
.expand-spacer {
  width: 16px;
}

.type-icon {
  width: 18px;
  height: 18px;
}

.category-title {
  font-size: 14px;
  font-weight: 500;
  color: #1a1a1a;
}
.dark .category-title { color: #e5e5e5; }

.item-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 1;
  transition: opacity 0.2s;
}

@media (min-width: 768px) {
  .item-actions {
    opacity: 0;
  }
  .category-item:hover .item-actions {
    opacity: 1;
  }
}

.children-list {
  background: rgba(0,0,0,0.01);
}
.dark .children-list {
  background: rgba(255,255,255,0.01);
}
</style>
