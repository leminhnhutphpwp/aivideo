import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = path.join(__dirname, '../src/app/(dashboard)/settings/page.tsx');
let content = fs.readFileSync(file, 'utf8');

// Replace specific settings classes
content = content.replace(/rounded-\[20px\]/g, 'rounded-xl');
content = content.replace(/p-5 md:p-6 bg-white\/5/g, 'p-5 bg-zinc-900 border-white/5');
content = content.replace(/bg-white\/5 border border-\[\#FF5A1F\]\/20/g, 'bg-zinc-900 border border-white/5');

fs.writeFileSync(file, content, 'utf8');
console.log('Settings cleaned.');
