import bcrypt from "bcrypt"
import { v4 as uuidv4 } from "uuid"
import jwt from "jsonwebtoken"
import { User } from '~/types'

interface ReqBody {
    email: string,
    password: string,
    login: string
}

export default defineEventHandler(async (event) => {
    const db = useDatabase();
    const config = useRuntimeConfig();

    setHeaders(event, {
        "Content-Type": "application/json; utf=8"
    })

    const body: ReqBody = await readBody(event);

    if (!body.email || !body.password || !body.login) {
        throw createError({
            status: 406,
            message: "Не все данные присутствуют в запросе"
        })
    }

    // Check uniqueness
    const existingLogin = await db.prepare('SELECT id FROM users WHERE login=?').get(body.login);
    const existingEmail = await db.prepare('SELECT id FROM users WHERE email=?').get(body.email);

    if (existingLogin || existingEmail) {
        throw createError({
            status: 406,
            message: "Такой пользователь уже есть, почта и логин должны быть уникальными"
        })
    }

    // Determine role: first user becomes admin
    const userCount = await db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
    const role = (userCount?.count === 0) ? 'admin' : 'user';

    const encrypted_password = await bcrypt.hash(body.password, 10);
    const uuid = uuidv4();
    const created_at = new Date().toISOString();

    // Insert user with role
    const stmt = db.prepare(
        'INSERT INTO users (login, email, encrypted_password, role, created_at, uuid) VALUES (?,?,?,?,?,?)'
    );
    const result = await stmt.run(body.login, body.email, encrypted_password, role, created_at, uuid);

    if (!result) {
        throw createError({
            status: 500,
            message: "Ошибка при создании пользователя"
        })
    }

    // Build safe user for response
    const safeUser: User = {
        login: body.login,
        email: body.email,
        role: role as 'user' | 'editor' | 'admin',
        created_at: created_at,
        uuid: uuid
    }

    // Auto-login: generate JWT
    const tokenJWT = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24),
        data: safeUser,
        created_at: Date.now()
    }, config.jwtSecret);

    return {
        res: {
            access_token: tokenJWT,
            token_type: 'bearer' as const,
            user: safeUser
        }
    }
})