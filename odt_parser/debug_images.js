const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const filesDir = path.join(__dirname, 'files');

if (fs.existsSync(filesDir)) {
    const files = fs.readdirSync(filesDir).filter(f => f.endsWith('.odt'));
    console.log(`Scanning ${files.length} ODT files...`);
    
    files.forEach(file => {
        const odtFile = path.join(filesDir, file);
        console.log(`\n--- Checking: ${file} ---`);
        const zip = new AdmZip(odtFile);
        const entries = zip.getEntries();
        
        let imgCount = 0;
        entries.forEach(e => {
            if (e.entryName.startsWith('Pictures/')) {
                console.log(` [IMG] - ${e.entryName}`);
                imgCount++;
            }
        });
        console.log(` Total embedded images found in zip: ${imgCount}`);

        const contentXml = zip.getEntry('content.xml');
        if (contentXml) {
            const xml = contentXml.getData().toString('utf8');
            const matches = xml.match(/<(draw:(?:image|frame))[^>]+>/g);
            if (matches) {
                console.log(` Found ${matches.length} draw tags in content.xml`);
                matches.slice(0, 3).forEach(m => {
                     const href = m.match(/xlink:href="([^"]+)"/);
                     console.log(`   Sample: ${m.substring(0, 70)}... -> href: ${href ? href[1] : 'NONE'}`);
                });
            } else {
                console.log(' No draw tags found.');
            }
        }
    });
} else {
    console.log('Files directory not found.');
}
