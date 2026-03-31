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
    let user: User;
    setHeaders(event, {
        "Content-Type": "application/json; utf=8"
    })
    const body: ReqBody = await readBody(event);
    if (body.email && body.password && body.login){
        const stmt = db.prepare('SELECT * FROM users WHERE login=?');
        const sql = await stmt.get(body.login);
        const stmt1 = db.prepare('SELECT * FROM users WHERE email=?');
        const sql1 = await stmt1.get(body.email);
        if (sql || sql1) {
            throw createError({
                status: 406,
                message: "Такой пользователь уже есть, почта и логин должны быть уникальными"
            })
        }
        const encrypted_password = await bcrypt.hash(body.password, 10);
        const uuid = uuidv4();
        user = {
            login: body.login,
            email: body.email,
            encrypted_password: encrypted_password,
            created_at: new Date().toISOString(),
            uuid: uuid
        };
        //добавление нового юзера
        const stmt2 = db.prepare('INSERT INTO users (login, email, encrypted_password, created_at, uuid) VALUES (?,?,?,?,?)');
        const result = await stmt2.run(user.login, user.email, user.encrypted_password, user.created_at, user.uuid);
        if (result) {
            return {
                result: true
            }
        }
    } else {
        throw createError({
            status: 406,
            message: "Не все данные присутствуют в запросе"
        })
    }
})  