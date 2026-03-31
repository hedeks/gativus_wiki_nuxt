import fs from 'node:fs'

export default defineEventHandler((event) => {
    let QUIZ_DIR = './data/quizez/';
    let files = fs.readdirSync(QUIZ_DIR);

    let data: Object[] = [];
    files.forEach((file) => {
        if (file.endsWith('.json')) {
            let content = fs.readFileSync(QUIZ_DIR + file, 'utf-8');
            data.push(JSON.parse(content));
        }
    });

    setResponseHeaders(event, {
        "content-type": "application/json; charset=utf-8",
    });
    return data;
})