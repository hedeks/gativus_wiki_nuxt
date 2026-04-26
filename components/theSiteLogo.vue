<template>
    <div @click="navigateTo('/')"
        class="flex p-2 w-fit gap-2 items-center rounded-xl cursor-pointer hover:bg-zinc-100/60 dark:hover:bg-zinc-800 transition-ease duration-300 justify-center group">
        <img class="h-7 w-7 group-hover:scale-105 transition-transform rounded-md" src="/images/121px-Logo.jpg"
            alt="">
        <span
            class="text-sm tracking-[0.3em] font-bold select-none uppercase text-gray-900 dark:text-gray-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Gativus</span>
    </div>
</template>