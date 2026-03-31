export type Quiz = {
    course_id: number,
    questions: Object[],
    title: string
}
export interface UserLogin {
    email: string,
    password: string
}

export interface User {
    id?: number,
    login: string,
    email: string,
    created_at: string,
    stats?: string,
    role?: string,
    last_visited?: string,
    encrypted_password: string,
    uuid: string
}
export interface Response {
    access_token: string,
    token_type: "bearer",
    user: User
}
