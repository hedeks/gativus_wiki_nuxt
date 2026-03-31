const AdmZip = require('adm-zip');
const fs = require('fs');

const odtFile = 'files/Глава Возникновение Субъективной Реальности.odt';
const zip = new AdmZip(odtFile);
const xml = zip.getEntry('content.xml').getData().toString('utf8');

// Ищем все draw:frame и выводим их целиком, чтобы понять структуру
console.log('--- Найдено draw:frame элементов ---');
const regex = /<draw:frame[^>]*>([\s\S]*?)<\/draw:frame>/g;
let match;
let count = 0;
while ((match = regex.exec(xml)) !== null && count < 10) {
    console.log(`\n--- Element ${++count} ---\n`);
    console.log(match[0]);
}
