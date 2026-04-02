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
    role: 'editor' | 'admin',
    created_at: string,
    last_visited?: string,
    encrypted_password?: string,
    uuid: string
}

export interface AuthResponse {
    access_token: string,
    token_type: 'bearer',
    user: User
}

// Legacy alias — keep for backward compatibility
export type Response = AuthResponse
