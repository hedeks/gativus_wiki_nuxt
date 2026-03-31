<template>
    <article class="flex prose-h1:font-semibold prose max-w-none xl:prose-lg md:prose-md prose-slate dark:prose-invert w-full prose-img:w-1/2 prose-img:mx-auto prose-img:h-auto">
        <ContentDoc path="/about"/>
   </article>
</template>


<script setup>
useHead({
    title: "О сайте" 
});
definePageMeta({
  layout: 'default',
});
</script>