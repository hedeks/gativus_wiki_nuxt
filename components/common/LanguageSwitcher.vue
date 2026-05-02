<!-- Кастомный select языка: токены --gv-* (design_system.md), AnchoredMenuDropdown для безопасного overflow. -->
<script setup lang="ts">
import { useLanguageStore } from '~/stores/language'

const props = withDefaults(
  defineProps<{
    /** Узкий хедер / тулбар: меньше поля и код языка вместо полного названия в триггере. */
    compact?: boolean
  }>(),
  { compact: false },
)

const langStore = useLanguageStore()

const langs = [
  { code: 'en' as const, label: 'EN', menuLabel: 'English' },
  { code: 'ru' as const, label: 'RU', menuLabel: 'Русский' },
  { code: 'zh' as const, label: 'ZH', menuLabel: '中文' },
] as const

const current = computed(() => langs.find(l => l.code === langStore.currentLang) ?? langs[0])

/** Текст на закрытом поле — select-паттерн: компактно код, иначе полное имя. */
const triggerLabel = computed(() => (props.compact ? current.value.label : current.value.menuLabel))

const panelWidthPx = computed(() => (props.compact ? 176 : 232))

function chooseLang (code: typeof langs[number]['code'], close: () => void) {
  langStore.setLanguage(code)
  close()
}
</script>

<template>
  <div class="gv-lang-select">
    <AnchoredMenuDropdown
      :panel-width="panelWidthPx"
    >
    <template #trigger="{ toggle, isOpen }">
      <button
        type="button"
        class="gv-lang-select__control gv-focusable"
        :class="{ 'gv-lang-select__control--open': isOpen, 'gv-lang-select__control--compact': compact }"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        aria-label="Language"
        @click="toggle"
      >
        <UIcon name="i-heroicons-language" class="gv-lang-select__leading-icon" aria-hidden="true" />
        <span class="gv-lang-select__value">{{ triggerLabel }}</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="gv-lang-select__chevron"
          :class="{ 'gv-lang-select__chevron--open': isOpen }"
          aria-hidden="true"
        />
      </button>
    </template>

    <template #default="{ close }">
      <ul class="gv-lang-select__list" role="listbox">
        <li v-for="item in langs" :key="item.code" role="presentation">
          <button
            type="button"
            role="option"
            class="gv-lang-select__option gv-focusable"
            :class="{ 'gv-lang-select__option--selected': langStore.currentLang === item.code }"
            :aria-selected="langStore.currentLang === item.code"
            @click="chooseLang(item.code, close)"
          >
            <span class="gv-lang-select__option-code">{{ item.label }}</span>
            <span class="gv-lang-select__option-label">{{ item.menuLabel }}</span>
          </button>
        </li>
      </ul>
    </template>
    </AnchoredMenuDropdown>
  </div>
</template>

<style scoped>
.gv-lang-select {
  display: inline-flex;
  max-width: 100%;
}

.gv-lang-select__control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 40px;
  padding: 8px 12px;
  margin: 0;
  border-radius: var(--gv-radius-control);
  border: 1px solid color-mix(in srgb, var(--gv-border-principal) 82%, var(--gv-primary) 18%);
  background: color-mix(in srgb, var(--gv-surface-header) 88%, var(--gv-surface-card) 12%);
  box-shadow: var(--gv-shadow-sm);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--gv-text-primary);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease,
    color 0.18s ease;
}

.gv-lang-select__control:hover {
  border-color: color-mix(in srgb, var(--gv-border-principal) 68%, var(--gv-primary) 32%);
  background: color-mix(in srgb, var(--gv-surface-header) 92%, var(--gv-surface-card) 8%);
}

.gv-lang-select__control--open {
  border-color: color-mix(in srgb, var(--gv-primary) 42%, var(--gv-border-principal));
  box-shadow:
    var(--gv-shadow-sm),
    0 0 0 1px color-mix(in srgb, var(--gv-primary) 22%, transparent);
}

.gv-lang-select__control--compact {
  gap: 6px;
  min-height: 40px;
  padding: 6px 10px;
  font-size: 12px;
}

.gv-lang-select__leading-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  color: var(--gv-text-secondary);
  opacity: 0.92;
}

.gv-lang-select__control--open .gv-lang-select__leading-icon {
  color: var(--gv-primary);
}

.gv-lang-select__value {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gv-lang-select__chevron {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--gv-text-secondary);
  opacity: 0.65;
  transition: transform 0.2s cubic-bezier(0.705, 0.01, 0, 0.915);
}

.gv-lang-select__chevron--open {
  transform: rotate(180deg);
  opacity: 0.95;
  color: var(--gv-primary);
}

@media (max-width: 360px) {
  .gv-lang-select__control--compact {
    padding: 6px 8px;
    gap: 4px;
    font-size: 11px;
  }

  .gv-lang-select__leading-icon {
    width: 16px;
    height: 16px;
  }
}

.gv-lang-select__list {
  list-style: none;
  margin: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gv-lang-select__option {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  margin: 0;
  border: none;
  border-radius: calc(var(--gv-radius-control) - 4px);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--gv-text-primary);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease, color 0.15s ease;
}

.gv-lang-select__option:hover {
  background: color-mix(in srgb, var(--gv-primary) 10%, transparent);
}

.gv-lang-select__option--selected {
  background: color-mix(in srgb, var(--gv-primary) 14%, transparent);
  color: var(--gv-primary);
  font-weight: 700;
}

.gv-lang-select__option-code {
  flex: 0 0 2.25rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: var(--gv-text-secondary);
}

.gv-lang-select__option--selected .gv-lang-select__option-code {
  color: var(--gv-primary);
}

.gv-lang-select__option-label {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
