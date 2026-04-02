import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import { User, UserLogin } from "~/types"

export default defineEventHandler(async (event) => {
    setHeaders(event, {
        "Content-Type": "application/json; utf=8"
    })
    const db = useDatabase();
    const config = useRuntimeConfig();
    let user: User;
    let compareResult = false;
    const body: UserLogin = await readBody(event);

    if (body.email && body.password) {
        const stmt = db.prepare('SELECT * FROM users WHERE email=?');
        const row = await stmt.get(body.email) as any;

        if (!row) {
            throw createError({
                status: 404,
                message: "Пользователь не найден"
            })
        }

        user = row as User;

        if (!user.encrypted_password) {
            throw createError({
                status: 406,
                message: "Не можем прочитать пароль с сервера"
            })
        }
        compareResult = await bcrypt.compare(body.password, user.encrypted_password);
    } else {
        throw createError({
            status: 406,
            message: "Введите верную структуру данных"
        })
    }

    if (!compareResult) {
        throw createError({
            status: 406,
            message: "Пароль неверный"
        })
    }

    // Build safe user object (without password)
    const safeUser: User = {
        id: user.id,
        login: user.login,
        email: user.email,
        role: (user as any).role || 'editor',
        created_at: user.created_at,
        last_visited: user.last_visited,
        uuid: user.uuid
    }

    const tokenJWT = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
        data: safeUser,
        created_at: Date.now()
    }, config.jwtSecret);

    // Update/create session
    const stmt0 = db.prepare('SELECT * FROM sessions where uuid=?');
    const sql0 = await stmt0.get(user.uuid);
    if (!sql0) {
        const stmt = db.prepare('INSERT INTO sessions (uuid, bearer) VALUES (?,?)');
        await stmt.run(user.uuid, tokenJWT);
    } else {
        const stmtUpdate = db.prepare('UPDATE sessions SET bearer=? WHERE uuid=?');
        await stmtUpdate.run(tokenJWT, user.uuid);
    }

    // Update last_visited
    const stmt2 = db.prepare('UPDATE users SET last_visited=? WHERE uuid=?');
    await stmt2.run(new Date().toISOString(), user.uuid);

    return {
        res: {
            access_token: tokenJWT,
            token_type: 'bearer' as const,
            user: safeUser
        }
    }
})