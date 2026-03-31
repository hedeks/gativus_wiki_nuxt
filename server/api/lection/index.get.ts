import fs from 'node:fs'

export default defineEventHandler((event) => {
    let QUIZ_DIR = './content/courses/';
    let files = fs.readdirSync(QUIZ_DIR);
    let data: Object[] = [];
    files.forEach((file) => {
        if (file.endsWith('.md')) {
            let content = fs.readFileSync(QUIZ_DIR + file, 'utf-8');
            data.push(content);
        }
    });

    setResponseHeaders(event, {
        "content-type": "application/json; charset=utf-8",
    });
    return data;
})