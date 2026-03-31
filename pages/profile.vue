<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const store = userStore();
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

import type { ChartData } from 'chart.js';
import { Bar } from 'vue-chartjs'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

import { ref } from 'vue';
const chartData = ref<ChartData<'bar'>>({
    labels: [
        'Завершенные темы',
        'Средний балл',
        'Минимальное число попыток на решение одного теста на 100% ',
    ],
    datasets: [
        {
            label: "Ваш результат",
            backgroundColor: "rgba(0,0,0,0.1)",
            hoverBackgroundColor: "rgba(0,0,0,0.3)",
            borderColor: "rgba(0,0,0,1)",
            hoverBorderColor: "rgba(0,0,0,1)",
            data: [1,(85/100)*5,3]
        },
        {
            label: "Лучший результат на сайте",
            backgroundColor: "rgba(0,0,0,0.3)",
            hoverBackgroundColor: "rgba(0,0,0,0.6)",
            borderColor: "rgba(0,0,0,1)",
            hoverBorderColor: "rgba(0,0,0,1)",
            data: [5,4.95,1]
        },
    ]
});
const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
});
useHead({
    title: "Профиль"
})
const user = store.userInfo;
const role = ref(user.role);

const { data, pending } = useFetch('/api/quiz');
const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
};

interface Roles {
    admin: string,
    "преподаватель": string
    "студент": string,
}

const roles: Roles = {
    admin: "редактирование и удаление курсов, просмотр списка студентов",
    "преподаватель": "редактирование и удаление курсов, просмотр списка студентов",
    "студент": "прохождение курсов, редактирование профиля"
}
</script>


<template>
    <UCard class="w-full min-h-full dark:shadow-darkShadow"
        :ui="{ ring: 'dark:ring-gray-500', divide: 'dark:divide-gray-500', background: 'bg-white dark:bg-neutral-900', header: { base: 'dark:bg-black rounded-xl bg-gray-50' } }">
        <template #header>
            <h1 class="text-3xl font-bold">
                Ваш профиль
            </h1>
        </template>
        <div class="flex flex-wrap justify-center w-full">
            <div id="stats" class="flex col-span-1 p-5 items-startz justify-center py-2 w-full">
                <UCard class="text-center dark:shadow-darkShadow h-full w-fit sm:w-full"
                    :ui="{ ring: 'dark:ring-gray-500', divide: 'dark:divide-gray-500', background: 'bg-gray-50 dark:bg-zinc-800', header: { base: 'dark:bg-black rounded-t-lg bg-gray-100' } }">
                    <template #header>
                        <h2 class="text-xl text-center font-bold">
                            Статистика
                        </h2>
                    </template>
                    <Bar :data="chartData" :options="chartOptions" class="h-96 w-full max-w-full" />
                </UCard>
            </div>
            <theAdministration />
            <div id="information"
                class="flex break-all col-span-1 justify-center py-2 w-fit max-w-full sm:w-sm lg:w-xl lg:max-w-xl">
                <UCard class="dark:shadow-darkShadow w-full"
                    :ui="{ ring: 'dark:ring-gray-500', divide: 'dark:divide-gray-500', background: 'bg-gray-50 dark:bg-zinc-800', header: { base: 'dark:bg-black rounded-xl bg-gray-100' } }">
                    <template #header>
                        <h2 class="text-xl font-bold text-center">
                            Информация о вас
                        </h2>
                    </template>
                    <div class="flex flex-col justify-center p-1 gap-3">
                        <span class="font-semibold">Ваш email:</span>
                        <span
                            class="flex shadow-sm dark:shadow-darkShadow border text-sm px-2 py-1 rounded text-center">{{
                                user?.email
                            }}</span>
                        <span class="font-semibold">Дата создания аккаунта:</span>
                        <span
                            class="flex shadow-sm dark:shadow-darkShadow border text-sm px-2 py-1 rounded text-center">{{
                                new
                                    Date(user?.created_at as string).toLocaleDateString('ru-RU', options) }}</span>
                        <span class="font-semibold">Ваша роль:</span>
                        <span
                            class="flex shadow-sm dark:shadow-darkShadow border text-sm px-2 py-1 rounded text-center">{{
                                user?.role
                            }}</span>
                        <span class="font-semibold">Ваши возможности на сайте:</span>
                        <span
                            class="flex max-w-full flex-wrap text-wrap break-all shadow-sm dark:shadow-darkShadow border text-sm px-2 py-1 rounded text-center">
                            {{
                                roles[user?.role as
                                keyof
                                Roles] }}</span>
                        <UButton icon="i-heroicons-pencil-square" block color="black"
                            class="mt-5 dark:shadow-darkShadow" variant="solid" label="Изменить" :loading="pending" />
                    </div>
                </UCard>
            </div>
            <div id="analitics" class="flex col-span-1 p-5 items-start h-full justify-center py-2 w-full">
                <UCard class="text-center dark:shadow-darkShadow w-fit sm:w-full"
                    :ui="{ ring: 'dark:ring-gray-500', divide: 'dark:divide-gray-500', background: 'bg-white dark:bg-stone-900', header: { base: 'dark:bg-black rounded-xl bg-gray-50' } }">
                    <template #header>
                        <h2 class="text-xl text-center font-bold">
                            Аналитика прохождения
                        </h2>
                    </template>
                </UCard>
            </div>
        </div>
    </UCard>
</template>