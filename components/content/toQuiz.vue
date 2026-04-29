<template>
  <GvButton
    color="sky"
    variant="solid"
    block
    icon="i-heroicons-arrow-right"
    trailing
    class="rounded-none lg:text-xl sm:text-lg"
    label="Перейти к тесту"
    @click="$emit('changeView', 'quiz')"
  />
</template>
