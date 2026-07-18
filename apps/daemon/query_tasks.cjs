const Database = require('better-sqlite3');
const db = new Database('./.od/app.sqlite', { readonly: true });
const stmt = db.prepare("SELECT * FROM media_tasks WHERE project_id = '17d7c8e2-5aa2-4ea3-890f-28b8ae335037'");
const row = stmt.get();
console.log(row ? JSON.stringify(row, null, 2) : 'Task not found');
