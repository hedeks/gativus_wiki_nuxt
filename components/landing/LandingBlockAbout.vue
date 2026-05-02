<script setup lang="ts">
import type { LandingBlockResolved } from '~/types/landing'
import HomeAboutDetail from '~/components/home/HomeAboutDetail.vue'

defineProps<{
  block: LandingBlockResolved
  reducedMotion?: boolean
}>()
</script>

<template>
  <div class="home-anim-target">
    <HomeAboutDetail :block="block" :reduced-motion="reducedMotion" />
  </div>
</template>
