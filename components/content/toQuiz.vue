<template>
    <UButton
    @click="$emit('changeView', 'quiz')"
    variant="solid"
    block
    color="black"
    class="rounded-none lg:text-xl sm:text-lg"
    trailing-icon="i-heroicons-arrow-right"
    :ui="{base: 'items-center'}"
    label="Перейти к тесту"
    />
</template>