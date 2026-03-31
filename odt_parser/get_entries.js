const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

const odtFile = 'files/Глава Возникновение Субъективной Реальности.odt';
if (fs.existsSync(odtFile)) {
    const zip = new AdmZip(odtFile);
    const entries = zip.getEntries().map(e => e.entryName);
    fs.writeFileSync('odt_entries.txt', entries.join('\n'));
    console.log('Entries written to odt_entries.txt');
} else {
    console.log('File not found');
}
