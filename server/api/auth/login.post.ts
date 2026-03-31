import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import {User, UserLogin, Response} from "~/types"
export default defineEventHandler(async (event) => {
    setHeaders(event, {
        "Content-Type": "application/json; utf=8"
    })
    const db = useDatabase();
    let user: User;
    let compareResult = false;
    const body: UserLogin = await readBody(event);
    if (body.email && body.password) {
        const stmt = db.prepare('SELECT * FROM users WHERE email=?');
        user = await stmt.get(body.email) as User;
        if (!user.encrypted_password){
            console.log(user);

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

    let res: Response = {
        access_token: "",
        token_type: "bearer",
        user: user
    }

    if (compareResult) {
        var tokenJWT = jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
            data: user,
            created_at: Date.now()
        }, 'Секретный код');
        //проверка на наличие уже активных сессий
        const stmt0 = db.prepare('SELECT * FROM sessions where uuid=?');
        const sql0 = await stmt0.get(user.uuid);
        if (!sql0){
            const stmt = db.prepare('INSERT INTO sessions (uuid, bearer) VALUES (?,?)');
            const sql = await stmt.run(user.uuid, tokenJWT);
        }

        const stmt2 = db.prepare('UPDATE users SET last_visited=? WHERE uuid=?');
        const sql2 = await stmt2.run(new Date().toISOString(), user.uuid);

        res = {
            access_token: tokenJWT,
            token_type: 'bearer',
            user: user
        };
    } else {
        throw createError({
            status: 406,
            message: "Пароль неверный"
        })
    }

    return {
        res
    }
})