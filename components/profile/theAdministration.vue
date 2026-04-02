<script setup lang="ts">
const store = userStore();
const role = computed(() => store.userInfo?.role);

const { data, pending } = useFetch('/api/quiz');

const courses = computed(() => {
    return (data.value as any[])?.sort((a: any, b: any) => a.course_id - b.course_id)
});
</script>


<template>
    <div id="admistration" v-if="role === 'admin'" class="flex col-span-1 p-5 items-start h-full justify-center py-2">
        <UCard class="text-center dark:shadow-darkShadow w-fit sm:w-full"
            :ui="{ ring: 'dark:ring-gray-500', divide: 'dark:divide-gray-500', background: 'bg-gray-50 dark:bg-zinc-800', header: { base: 'dark:bg-black rounded-xl bg-gray-100' } }">
            <template #header>
                <h2 class="text-xl font-bold text-center">
                    Администрирование
                </h2>
            </template>
            <div class="flex flex-col p-1 gap-3">
                <h3 class="font-semibold w-fit">
                    {{ "Количество курсов на сайте: " + data?.length }}
                </h3>
                <span class="flex shadow-sm dark:shadow-darkShadow border text-sm px-2 py-1 rounded text-start"
                    v-for="course in courses as Quiz[]" :key="course.course_id">
                    {{ "(course_id: " + course.course_id + ") " + course.title }} </span>
            </div>
            <UButton icon="i-heroicons-arrow-right" trailing block color="black"
                class="dark:shadow-darkShadow flex flex-wrap mx-auto mt-5" variant="solid" to="/admin"
                label="Перейти к панели управления контентом" :loading="pending" />
        </UCard>
    </div>
</template>