<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { computed, useAttrs, useSlots } from 'vue'

defineOptions({ inheritAttrs: false, name: 'GvButton' })

const props = withDefaults(
  defineProps<{
    to?: string | RouteLocationRaw
    href?: string
    target?: string
    rel?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
    loading?: boolean
    block?: boolean
    square?: boolean
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    variant?: 'solid' | 'ghost' | 'soft' | 'outline'
    /**
     * primary / sky — акцент дизайн-системы (sky-600 / sky-500); для основных CTA используйте sky или primary.
     * black — монохромный «ink» (редкие случаи); предпочтительно sky.
     */
    color?: 'primary' | 'black' | 'sky' | 'gray' | 'red' | 'rose'
    icon?: string
    /** Иконка после текста (как UButton trailing) */
    trailing?: boolean
    label?: string
    title?: string
    /**
     * Без размерных отступов/min-height — внешний класс (toolbar, sidebar) задаёт вид.
     */
    chromeless?: boolean
    /** Без тона gv-btn (фон/бордер) — внешние классы задают весь вид. */
    unstyled?: boolean
  }>(),
  {
    type: 'button',
    size: 'md',
    variant: 'solid',
    color: 'primary',
  },
)

const emit = defineEmits<{ click: [e: MouseEvent] }>()

const slots = useSlots()
const attrs = useAttrs()

const passthroughAttrs = computed(() => {
  const a = attrs as Record<string, unknown>
  const { class: _c, ...rest } = a
  return rest
})

const tone = computed(() => {
  if (props.unstyled) return 'unstyled'
  const { variant, color } = props
  if (variant === 'ghost') {
    if (color === 'red') return 'ghost-danger'
    return 'ghost'
  }
  if (variant === 'soft') {
    if (color === 'rose') return 'soft-rose'
    if (color === 'sky') return 'soft-sky'
    return 'soft'
  }
  if (variant === 'outline') return 'outline'
  if (color === 'red') return 'danger'
  if (color === 'gray') return 'neutral'
  if (color === 'black') return 'ink'
  if (color === 'sky' || color === 'primary') return 'accent'
  return 'accent'
})

const isDisabled = computed(() => props.disabled || props.loading)

const relComputed = computed(() => {
  if (props.rel) return props.rel
  if (props.target === '_blank') return 'noopener noreferrer'
  return undefined
})

const mergedClass = computed(() => {
  const list: (string | undefined)[] = [
    'gv-btn',
    ...(props.unstyled ? [] : [`gv-btn--${tone.value}`]),
    props.unstyled ? 'gv-btn--unstyled' : '',
    props.chromeless ? 'gv-btn--chromeless' : `gv-btn--${props.size}`,
    props.block ? 'gv-btn--block' : '',
    props.square ? 'gv-btn--square' : '',
    isDisabled.value ? 'gv-btn--disabled' : '',
  ]
  const extra = attrs.class
  if (typeof extra === 'string') list.push(extra)
  else if (Array.isArray(extra)) list.push(...extra.map(String))
  return list.filter(Boolean)
})

const iconClass = computed(() => {
  const key = props.size
  const map: Record<string, string> = {
    xs: 'gv-btn__icon--xs',
    sm: 'gv-btn__icon--sm',
    md: 'gv-btn__icon--md',
    lg: 'gv-btn__icon--lg',
    xl: 'gv-btn__icon--xl',
  }
  return ['gv-btn__icon', map[key]]
})

function onInnerClick(e: MouseEvent) {
  if (isDisabled.value) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  emit('click', e)
}

const showLabel = computed(() => !!(props.label || slots.default))
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :target="target"
    :rel="relComputed"
    v-bind="passthroughAttrs"
    :class="mergedClass"
    :title="title"
    :aria-busy="loading ? true : undefined"
    :aria-disabled="isDisabled ? true : undefined"
    :tabindex="isDisabled ? -1 : undefined"
    @click="onInnerClick"
  >
    <UIcon
      v-if="loading"
      name="i-heroicons-arrow-path"
      :class="[...iconClass, 'gv-btn__icon--spin']"
    />
    <template v-else>
      <UIcon
        v-if="icon && !trailing"
        :name="icon"
        :class="iconClass"
      />
    </template>
    <span v-if="showLabel" class="gv-btn__label">
      <slot>{{ label }}</slot>
    </span>
    <UIcon
      v-if="!loading && icon && trailing"
      :name="icon"
      :class="iconClass"
    />
    <slot name="trailing" />
  </NuxtLink>
  <a
    v-else-if="href"
    :href="href"
    :target="target"
    :rel="relComputed"
    v-bind="passthroughAttrs"
    :class="mergedClass"
    :title="title"
    :aria-busy="loading ? true : undefined"
    :aria-disabled="isDisabled ? true : undefined"
    :tabindex="isDisabled ? -1 : undefined"
    @click="onInnerClick"
  >
    <UIcon
      v-if="loading"
      name="i-heroicons-arrow-path"
      :class="[...iconClass, 'gv-btn__icon--spin']"
    />
    <template v-else>
      <UIcon
        v-if="icon && !trailing"
        :name="icon"
        :class="iconClass"
      />
    </template>
    <span v-if="showLabel" class="gv-btn__label">
      <slot>{{ label }}</slot>
    </span>
    <UIcon
      v-if="!loading && icon && trailing"
      :name="icon"
      :class="iconClass"
    />
    <slot name="trailing" />
  </a>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    v-bind="passthroughAttrs"
    :class="mergedClass"
    :title="title"
    :aria-busy="loading ? true : undefined"
    @click="onInnerClick"
  >
    <UIcon
      v-if="loading"
      name="i-heroicons-arrow-path"
      :class="[...iconClass, 'gv-btn__icon--spin']"
    />
    <template v-else>
      <UIcon
        v-if="icon && !trailing"
        :name="icon"
        :class="iconClass"
      />
    </template>
    <span v-if="showLabel" class="gv-btn__label">
      <slot>{{ label }}</slot>
    </span>
    <UIcon
      v-if="!loading && icon && trailing"
      :name="icon"
      :class="iconClass"
    />
    <slot name="trailing" />
  </button>
</template>

<style scoped>
/* Кнопки: manifests/design_system.md §1.1 Primary (sky), §3, §2.1–2.2, §5 */
.gv-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: none;
  text-decoration: none;
  white-space: nowrap;
  border-radius: 12px;
  border: 1px solid transparent;
  cursor: pointer;
  line-height: 1.25;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.gv-btn:focus-visible {
  outline: 2px solid color-mix(in srgb, #0284c7 50%, transparent);
  outline-offset: 2px;
}

.dark .gv-btn:focus-visible {
  outline-color: color-mix(in srgb, #38bdf8 55%, transparent);
}

.gv-btn--disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.gv-btn:active:not(.gv-btn--disabled):not(.gv-btn--chromeless):not(.gv-btn--unstyled) {
  transform: translateY(0);
  transition-duration: 0.15s;
}

.gv-btn--block {
  width: 100%;
}

.gv-btn--square {
  aspect-ratio: 1;
  padding-left: 0;
  padding-right: 0;
}

/*
 * Размеры под повседневный UI (≈ text-xs … text-base на странице).
 * md по умолчанию ≈ Tailwind text-sm (14px).
 */
.gv-btn--xs {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
  gap: 0.3rem;
  border-radius: 8px;
}
.gv-btn--sm {
  min-height: 34px;
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 10px;
}
.gv-btn--md {
  min-height: 38px;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 12px;
}
.gv-btn--lg {
  min-height: 42px;
  padding: 10px 18px;
  font-size: 15px;
  border-radius: 12px;
}
.gv-btn--xl {
  min-height: 48px;
  padding: 12px 22px;
  font-size: 16px;
  letter-spacing: 0.015em;
  border-radius: 12px;
}

.gv-btn--square.gv-btn--xs {
  min-width: 30px;
  padding: 0;
}
.gv-btn--square.gv-btn--sm {
  min-width: 34px;
  padding: 0;
}
.gv-btn--square.gv-btn--md {
  min-width: 38px;
  padding: 0;
}
.gv-btn--square.gv-btn--lg {
  min-width: 42px;
  padding: 0;
}
.gv-btn--square.gv-btn--xl {
  min-width: 48px;
  padding: 0;
}

.gv-btn--chromeless {
  min-height: unset !important;
  min-width: unset !important;
  padding: 0 !important;
  box-shadow: none !important;
  letter-spacing: inherit;
  border-radius: inherit;
  gap: 0.25rem;
}

.gv-btn--chromeless.gv-btn--square {
  aspect-ratio: 1;
}

.gv-btn--unstyled {
  background: transparent;
  color: inherit;
  border-color: transparent;
  box-shadow: none;
  font-family: inherit;
  font-weight: inherit;
  font-size: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
}

.gv-btn__label {
  line-height: 1.25;
}

.gv-btn__icon--xs {
  width: 14px;
  height: 14px;
}
.gv-btn__icon--sm {
  width: 15px;
  height: 15px;
}
.gv-btn__icon--md {
  width: 16px;
  height: 16px;
}
.gv-btn__icon--lg {
  width: 18px;
  height: 18px;
}
.gv-btn__icon--xl {
  width: 20px;
  height: 20px;
}

.gv-btn__icon--spin {
  animation: gv-btn-spin 0.75s linear infinite;
}

@keyframes gv-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Primary = sky — design_system §1.1 (Light: sky-600, Dark: sky-500; hover sky-700 / sky-400) */
.gv-btn--accent {
  background: #0284c7; /* sky-600 */
  color: #ffffff;
  border-color: #0369a1; /* sky-700 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.dark .gv-btn--accent {
  background: #0ea5e9; /* sky-500 */
  color: #ffffff;
  border-color: #0284c7; /* sky-600 */
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(56, 189, 248, 0.12);
}
.gv-btn--accent:hover:not(.gv-btn--disabled) {
  background: #0369a1; /* sky-700 — Primary Hovered (light) */
  border-color: #075985;
  transform: translateY(-2px);
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.12),
    0 4px 6px -2px rgba(2, 132, 199, 0.22);
}
.dark .gv-btn--accent:hover:not(.gv-btn--disabled) {
  background: #38bdf8; /* sky-400 — Primary Hovered (dark) */
  border-color: #0ea5e9;
  color: #ffffff;
  box-shadow:
    0 10px 25px -5px rgba(0, 0, 0, 0.35),
    0 4px 14px rgba(56, 189, 248, 0.35);
}

/* Плотный монохром — не из манифеста Primary, сохранён для существующих экранов */
.gv-btn--ink {
  background: #18181b;
  color: #fafafa;
  border-color: rgba(24, 24, 27, 0.94);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.dark .gv-btn--ink {
  background: #e4e4e7;
  color: #18181b;
  border-color: rgba(228, 228, 231, 0.9);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
}
.gv-btn--ink:hover:not(.gv-btn--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12);
}
.dark .gv-btn--ink:hover:not(.gv-btn--disabled) {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
}

.gv-btn--neutral {
  background: #f9f9f9;
  color: #27272a;
  border-color: #e4e4e7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.dark .gv-btn--neutral {
  background: #27272a;
  color: #e5e5e5;
  border-color: #3f3f46;
}
.gv-btn--neutral:hover:not(.gv-btn--disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.dark .gv-btn--neutral:hover:not(.gv-btn--disabled) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.gv-btn--danger {
  background: #dc2626;
  color: #fff;
  border-color: color-mix(in srgb, #b91c1c 40%, #dc2626);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.gv-btn--danger:hover:not(.gv-btn--disabled) {
  background: #b91c1c;
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.25);
}

.gv-btn--ghost {
  background: transparent;
  color: #52525b;
  border-color: transparent;
  box-shadow: none;
}
.dark .gv-btn--ghost {
  color: #a1a1aa;
}
.gv-btn--ghost:hover:not(.gv-btn--disabled) {
  background: rgba(24, 24, 27, 0.04);
  color: #18181b;
}
.dark .gv-btn--ghost:hover:not(.gv-btn--disabled) {
  background: rgba(255, 255, 255, 0.06);
  color: #fafafa;
}

.gv-btn--ghost-danger {
  background: transparent;
  color: #dc2626;
  border-color: transparent;
  box-shadow: none;
}
.gv-btn--ghost-danger:hover:not(.gv-btn--disabled) {
  background: rgba(220, 38, 38, 0.06);
}
.dark .gv-btn--ghost-danger {
  color: #f87171;
}

/* Secondary — design_system §3.1 (мягкий серый) */
.gv-btn--soft {
  background: #f9f9f9;
  color: #3f3f46;
  border-color: #e4e4e7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.dark .gv-btn--soft {
  background: #27272a;
  color: #e5e5e5;
  border-color: #3f3f46;
}
.gv-btn--soft:hover:not(.gv-btn--disabled) {
  border-color: color-mix(in srgb, #0284c7 22%, #e4e4e7);
  background: #f4f4f5;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}
.dark .gv-btn--soft:hover:not(.gv-btn--disabled) {
  background: #3f3f46;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.gv-btn--soft-sky {
  background: color-mix(in srgb, #0284c7 8%, #ffffff);
  color: #0369a1;
  border-color: color-mix(in srgb, #0284c7 18%, #e4e4e7);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.dark .gv-btn--soft-sky {
  background: rgba(14, 165, 233, 0.12);
  color: #7dd3fc;
  border-color: rgba(14, 165, 233, 0.28);
}
.gv-btn--soft-sky:hover:not(.gv-btn--disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.12);
}
.dark .gv-btn--soft-sky:hover:not(.gv-btn--disabled) {
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}

.gv-btn--soft-rose {
  background: rgba(244, 63, 94, 0.09);
  color: #e11d48;
  border-color: rgba(244, 63, 94, 0.22);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.dark .gv-btn--soft-rose {
  background: rgba(244, 63, 94, 0.14);
  color: #fda4af;
  border-color: rgba(244, 63, 94, 0.32);
}
.gv-btn--soft-rose:hover:not(.gv-btn--disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(244, 63, 94, 0.15);
}

.gv-btn--outline {
  background: transparent;
  color: #27272a;
  border-color: #d4d4d8;
  box-shadow: none;
}
.gv-btn--outline:hover:not(.gv-btn--disabled) {
  border-color: #0284c7;
  color: #0284c7;
  transform: translateY(-1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.dark .gv-btn--outline {
  color: #e5e5e5;
  border-color: #3f3f46;
}
.dark .gv-btn--outline:hover:not(.gv-btn--disabled) {
  border-color: #38bdf8;
  color: #38bdf8;
}
</style>
