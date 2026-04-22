<template>
    <div
        class="flex flex-col p-3 lg:p-10 flex-wrap-reverse lg:grid lg:grid-cols-12 lg:flex-nowrap gap-10 prose max-w-none prose-pre:text-black dark:prose-pre:text-white xl:prose-lg md:prose-md prose-sky dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto prose-pre:bg-gray-100 prose-pre:border dark:prose-pre:border-zinc-800 dark:prose-pre:bg-zinc-900 prose-h1:font-semibold">
        <theLeftQuizSelector @changeView="changeView" :is-theory="isTheory" :title="ast?.data.title"
            :quizTitle="ast?.data.metaTitle"
            class="lg:col-span-2 xl:col-span-3 lg:flex lg:sticky top-[--header-height] xl:justify-self-end xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]" />
        <div :class="[{ 'active': isTheory }, { 'inactive': !isTheory }]" ref="lection"
            class="flex flex-col-reverse lg:grid lg:grid-cols-10 xl:grid-cols-9 gap-10 w-full lg:col-span-10 xl:col-span-9 view-transition">
            <div
                class="w-full max-w-[900px] 2xl:max-w-[1000px] mx-auto lg:col-span-8 xl:col-span-6 flex-col bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 lg:p-10 p-5 rounded-2xl shadow-sm">
                <div v-if="ast?.data" class="flex flex-col mb-4">
                    <span v-if="ast.data.meta"
                        class="text-xs tracking-[0.3em] uppercase font-bold text-sky-600 dark:text-sky-400 mb-0">
                        {{ ast.data.meta }}
                    </span>
                    <h1
                        class="text-3xl lg:text-4xl mb-0 font-bold text-gray-900 dark:text-gray-100 uppercase tracking-widest leading-tight m-0 mb-0">
                        {{ ast.data.title }}
                    </h1>
                </div>
                <ContentRendererMarkdown v-if="ast !== undefined" :value="ast"
                    class="parent w-full lg:col-span-8 xl:col-span-6 flex-col">
                    <template #empty>
                        <p>Не найдено контента</p>
                    </template>
                </ContentRendererMarkdown>
                <toQuiz @changeView="changeView" class="mt-5 h-20">Перейти к тесту</toQuiz>
            </div>
            <theToc :activeID="activeID" @updateActiveID="handleTocClick" v-if="ast?.toc?.links.length"
                class="lg:w-auto lg:col-span-2 xl:col-span-3 xl:justify-self-start xl:w-full xl:max-w-[320px] 2xl:max-w-[360px]"
                title="Содержание" :links="ast?.toc.links" />
        </div>
        <div :class="[{ 'active': !isTheory }, { 'inactive': isTheory }]"
            class="flex w-full lg:h-[calc(100dvh_-_var(--header-height)_-_5rem)] dark:bg-zinc-950 bg-gray-50 items-center justify-center h-[calc(100dvh_-_var(--header-height)_-_1.5rem)] lg:col-span-10 xl:col-span-9 view-transition">
            <theQuizView :quizJSON="quizJson" ref="quiz" />
        </div>
        <theScrollToTop @scrolled="resetToFirstHeading" />
    </div>
</template>

<script setup lang="ts">
const activeID: Ref<string> = ref("");
const isTheory = ref(true);
const lection: Ref<HTMLElement | undefined> = ref();
const quiz: Ref<HTMLElement | undefined> = ref();
let isFirstObsCall = true;

let isScrollingManually = false;
let scrollTimeout: NodeJS.Timeout;

const handleTocClick = (id: string) => {
    activeID.value = id;
    isScrollingManually = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrollingManually = false;
    }, 1000);
}

const resetToFirstHeading = () => {
    // При нажатии "Наверх" сбрасываем активный элемент TOC на первый заголовок
    const firstLink = ast.value?.toc?.links?.[0];
    if (firstLink) {
        activeID.value = firstLink.id;
    } else {
        activeID.value = '';
    }
    // Блокируем observer на время плавного скролла
    isScrollingManually = true;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        isScrollingManually = false;
    }, 1000);
}

const observe = (filteredElements: Element[]) => {
    const callback: IntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
            if (!entry.isIntersecting && entry.boundingClientRect.y > 0 && !isFirstObsCall) {
                let index = filteredElements.indexOf(entry.target);
                if (index > 0 && !isScrollingManually) {
                    activeID.value = filteredElements[index - 1].id;
                }
            }
            if (entry.isIntersecting) {
                if (entry.target.id !== "" && !isScrollingManually) {
                    activeID.value = entry.target.id;
                }
            }
        })
        isFirstObsCall = false;
    }
    const observer = new IntersectionObserver(callback, {
        root: null,
        // Важно: верхняя граница обязательно должна быть 0px, 
        // иначе математика entry.boundingClientRect.y > 0 ломается 
        // при определении направления выхода элемента из зоны (вверх или вниз).
        rootMargin: "0px 0px -80% 0px"
    })
    filteredElements.forEach((item: Element) => {
        observer.observe(item)
    })
    return observer
};

const obs = ref<IntersectionObserver>()
const currentPosition = ref<number>();
// Scroll listener moved to onMounted
const changeView = (name: string) => {
    if (name === "quiz") {
        isTheory.value = false;
    } else {
        isTheory.value = true;
    }
    if (isTheory.value && currentPosition.value) {
        nextTick(() => {
            scrollTo({ top: currentPosition.value })
        })
    } else {
        scrollTo({ top: 0 });
    }
}

const route = useRoute();
const param = ref<string>();
if (typeof route.params.slug === 'string') {
    param.value = route.params.slug;
} else {
    param.value = route.params.slug[0];
}
const { data: articles, error } = await useAsyncData("lection", () => $fetch('/api/lection/' + param.value))
let ast = ref();
if (articles.value !== undefined && articles.value !== null) {
    ast.value = await parseMarkdown(articles.value[0 as keyof {}], {
        toc: {
            depth: 4,
            searchDepth: 4
        }
    });
};
const { data: quizJson } = await useAsyncData("quiz", () => $fetch('/api/quiz/' + ast.value.data.name));
useSeoMeta({
    ogImage: ast.value.data.imgPath,
    title: ast.value.data.metaTitle,
    ogDescription: ast.value.data.description
});
onMounted(() => {
    if (process.client) {
        window.addEventListener('scroll', () => {
            if (isTheory.value) {
                currentPosition.value = window.scrollY;
            }
        })
        window.addEventListener('resize', checkSize)
    }

    const elements = document.querySelectorAll('h2, h3, h4, h5');
    let filteredElements: Element[] = [];
    elements.forEach((item) => {
        if (item.parentElement?.classList.contains("parent") && item.id !== "") {
            filteredElements.push(item);
        }
    })
    obs.value = observe(filteredElements);
})
</script>

<style scoped>
.view-transition {
    transition: opacity 0.7s cubic-bezier(0.705, 0.010, 0.000, 0.915);
}

.active {
    opacity: 1;
    position: relative;
    pointer-events: auto;
}

.inactive {
    opacity: 0;
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
}
</style>