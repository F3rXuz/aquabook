
const initSqlJs = require('sql.js');
const fs = require('fs');

const dbDataPath = 'c:\\Users\\aainf15\\Desktop\\buscador\\dbData.js';
const content = fs.readFileSync(dbDataPath, 'utf8');
const match = content.match(/const DB_BASE64 = "([^"]+)";/);

if (match) {
    const base64 = match[1];
    const buffer = Buffer.from(base64, 'base64');
    
    initSqlJs().then(SQL => {
        const db = new SQL.Database(buffer);
        const res = db.exec("SELECT legajo, apellido, nombre FROM persona WHERE apellido LIKE '%Mamani%' AND nombre LIKE '%Yolanda%'");
        console.log(JSON.stringify(res));
        db.close();
    });
}
