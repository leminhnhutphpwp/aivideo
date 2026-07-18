const Database = require('better-sqlite3');
const db = new Database('./.od/app.sqlite', { readonly: true });
const stmt = db.prepare("SELECT * FROM media_tasks WHERE project_id = 'e3c4d4f4-571b-4d54-a91d-33f926374285'");
const row = stmt.get();
console.log(row ? JSON.stringify(row, null, 2) : 'Task not found');
