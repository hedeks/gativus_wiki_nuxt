import { defineStore } from "pinia";
import type { User } from "~/types";


export const userStore = defineStore('user', () => {
    const userInfo: User = {
        id: 0,
        login: "anonymous",
        email: "anonymous",
        created_at: "0",
        encrypted_password: "",
        uuid: ""
    };
    const isLoggedIn = false;
    
    return{
        userInfo,
        isLoggedIn
    }
})