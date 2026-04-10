
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Read dbData.js and extract the Base64 string
const dbDataPath = 'c:\\Users\\aainf15\\Desktop\\buscador\\dbData.js';
const content = fs.readFileSync(dbDataPath, 'utf8');
const match = content.match(/const DB_BASE64 = "([^"]+)";/);

if (match) {
    const base64 = match[1];
    const buffer = Buffer.from(base64, 'base64');
    
    initSqlJs().then(SQL => {
        const db = new SQL.Database(buffer);
        const res = db.exec("SELECT * FROM persona LIMIT 1");
        console.log(JSON.stringify(res[0].columns));
        db.close();
    });
} else {
    console.error("Could not find DB_BASE64 in dbData.js");
}
