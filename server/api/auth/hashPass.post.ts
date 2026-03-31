import bcrypt from "bcrypt"


export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    if (body.password) {
        const hash = await bcrypt.hash(body.password, 10);
        return {
            password: hash,
        }
    } else {
        throw createError({
            status: 406,
            message: "Невалидные данные"
        })
    }
})