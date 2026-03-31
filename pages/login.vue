<script setup lang="ts">

const toast = useToast()
const store = userStore();
const email: Ref<HTMLInputElement> = ref() as Ref<HTMLInputElement>;
const password: Ref<HTMLInputElement> = ref() as Ref<HTMLInputElement>;
const login:  Ref<HTMLInputElement> = ref() as Ref<HTMLInputElement>;
const isSignup: Ref<Boolean> = ref(false);
const errorMain = ref<AuthError | null>(null);
const isLoading: Ref<boolean> = ref(false)

// const signUp = async (): Promise<void> => {
//     isLoading.value = true;
//     const data = await $fetch("/api/auth/register",{
//         email: email.value.value,
//         password: password.value.value,
//         login: login.value.value;
//     });
//     isLoading.value = false;
//     const user = data.res.user;
//     if (user) {
//         toast.add({ title: `Подтвердите свой email ${user.email}`, ui: {
//                 background: 'bg-white dark:bg-neutral-900',
//                 progress: {
//                     background: 'bg-black dark:bg-white',
//                 }
//             } });
//     }
//     if (error) {
//         errorMain.value = error;
//         store.isLoggedIn = false;
//         store.userInfo = {};
//     }
// }

const loginFunc = async (): Promise<void> => {
    isLoading.value = true;
    const data = await $fetch( "/api/auth/login", { method: "POST", body: {
        email: email.value.value,
        password: password.value.value
    }});
    const user = data.res.user;
    isLoading.value = false;
    if (user) {
        toast.add({ title: `Вы вошли в аккаунт ${user.email}`, ui: {
                background: 'bg-white dark:bg-neutral-900',
                progress: {
                    background: 'bg-black dark:bg-white',
                }
            } });
        store.isLoggedIn = true;
        store.userInfo = user;
        navigateTo('/profile');
    } else {
        console.log('ку');
    }
    // if (error) {
    //     errorMain.value = error;
    //     store.isLoggedIn = false;
    //     console.log('awdawd');
    //     store.userInfo = {};
    // }


}
</script>

<template>
    <div class="container m-auto w-full h-full flex flex-col items-center justify-center">
        <UCard class="max-w-sm w-80 dark:shadow-darkShadow" :ui="{ ring:'dark:ring-gray-500', divide: 'dark:divide-gray-500' ,background: 'bg-white dark:bg-neutral-900', header: {base: 'dark:bg-black rounded-xl bg-gray-50'} }">
            <template #header>
                <div class="h-3 flex items-center justify-start text-xl font-bold">
                    <span v-if="isSignup">Регистрация</span>
                    <span v-else>Вход</span>
                </div>
            </template>
            <div class="h-fit">
                <form @submit.prevent="isSignup ? signUp() : loginFunc()" class="flex flex-col gap-2 items-center">
                    <input placeholder="почта email" type="text" ref="email" class="input">
                    <input v-if="isSignup" ref="login" class="input" placeholder="логин" type="text">
                    <input placeholder="пароль" type="password" ref="password" class="input">
                    <UButton block color="black" variant="solid" square type="submit" class="mt-7 shadow dark:shadow-darkShadow" :ui="{base: 'focus:outline-none focus-visible:outline-0 disabled:cursor-not-allowed disabled:opacity-75 flex-shrink-0'}"
                        label="Подтвердить" :loading="isLoading">
                        <template #trailing>
                            <UIcon name="i-heroicons-arrow-up-circle" class="w-5 h-5" />
                        </template>
                    </UButton>

                </form>
                <div v-if="errorMain" class="alert mt-5">
                    {{ errorMain.message }}</div>
            </div>
            <template #footer>
                <div class="h-8 flex items-center justify-center">
                    <span @click="isSignup = !isSignup" v-if="isSignup" class="cursor-pointer">У вас уже есть аккаунт?
                        Войти</span>
                    <span @click="isSignup = !isSignup" v-else class="cursor-pointer">Зарегистрироваться</span>
                </div>
            </template>
        </UCard>
        <span v-if="!store.isLoggedIn" class="alert mt-5">Просматривать
            курсы и профиль можно только войдя в аккаунт</span>
    </div>
</template>

<style scoped>
.input {
    @apply dark:shadow-darkShadow shadow-sm rounded bg-white dark:bg-gray-800 border dark:border-gray-600 px-2 py-1 outline-none focus:border-black dark:focus:border-white transition-all duration-300 w-full;
}

@keyframes wrong {
    0% {
        transform: translateX(5px);
        opacity: 0;
    }

    50% {
        transform: translateX(-5px);
        opacity: 0.5;
    }

    100% {
        transform: translateX(0);
        opacity: 1;
    }
}

.alert {
    @apply text-center border border-red-500 text-red-900 dark:text-red-400 dark:bg-red-950 bg-red-50 p-5 rounded shadow uppercase tracking-widest font-mono font-bold transition ease-linear duration-300 animate-slide;
}
</style>