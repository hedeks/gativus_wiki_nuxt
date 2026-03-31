import fs from 'node:fs'

export default defineEventHandler((event) => {
    let QUIZ_DIR = './content/courses/';
    let fileName = event.context.params?._
    let contentA = "";
    if (fs.existsSync(QUIZ_DIR + fileName + ".md")) {
        contentA = fs.readFileSync(QUIZ_DIR + fileName + ".md", 'utf-8');
    } else {
        throw createError({
            status: 400,
            statusMessage: "Файла не существует!"
        })
    }
    setResponseHeaders(event, {
        "content-type": "application/json; charset=utf-8",
    });
    return [contentA]
})