import fs from 'node:fs'

export default defineEventHandler((event) => {
    let QUIZ_DIR = './data/quizez/';
    let fileName = event.context.params?._
    let content = "";
    if (fs.existsSync(QUIZ_DIR + fileName + ".json")) {
        content = fs.readFileSync(QUIZ_DIR + fileName + ".json", 'utf-8');
    } else {
        throw createError({
            status: 400,
            statusMessage: "Файла не существует!"
        })
    }
    setResponseHeaders(event, {
        "content-type": "application/json; charset=utf-8",
    });
    return content
})