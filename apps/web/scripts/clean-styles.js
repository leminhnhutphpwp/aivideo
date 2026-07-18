import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      walk(p, callback);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts') || p.endsWith('.css')) {
      callback(p);
    }
  }
}

const dir = path.join(__dirname, '../src');

let count = 0;

walk(dir, (file) => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;

  // 1. Padding / Layout
  newContent = newContent.replace(/\bp-10\b/g, 'p-6');
  newContent = newContent.replace(/\bp-12\b/g, 'p-8');
  newContent = newContent.replace(/\bp-8\b/g, 'p-6');
  newContent = newContent.replace(/\bmd:p-10\b/g, 'md:p-6');
  newContent = newContent.replace(/\bmd:p-8\b/g, 'md:p-6');
  newContent = newContent.replace(/\blg:p-10\b/g, 'lg:p-8');
  newContent = newContent.replace(/\blg:p-12\b/g, 'lg:p-8');
  
  newContent = newContent.replace(/\bgap-10\b/g, 'gap-6');
  newContent = newContent.replace(/\bgap-8\b/g, 'gap-6');

  // 2. Border Radius
  newContent = newContent.replace(/rounded-\[32px\]/g, 'rounded-2xl');
  newContent = newContent.replace(/rounded-\[24px\]/g, 'rounded-xl');
  newContent = newContent.replace(/rounded-3xl/g, 'rounded-2xl');

  // 3. Shadows
  newContent = newContent.replace(/\bshadow-2xl\b/g, 'shadow-md');
  newContent = newContent.replace(/\bshadow-xl\b/g, 'shadow-sm');
  newContent = newContent.replace(/\bshadow-lg\b/g, 'shadow-sm');
  newContent = newContent.replace(/shadow-\[0_0_50px_rgba\(255,90,31,0\.05\)\]/g, 'shadow-sm');

  // 4. Colors (Make it less stark black)
  newContent = newContent.replace(/bg-\[#0A0A0A\]/gi, 'bg-zinc-950');
  newContent = newContent.replace(/bg-\[#0c0c0c\]/gi, 'bg-zinc-950');
  newContent = newContent.replace(/bg-\[#080808\]/gi, 'bg-zinc-950');
  newContent = newContent.replace(/bg-\[#111\]/gi, 'bg-zinc-900');
  newContent = newContent.replace(/bg-\[#141418\]/gi, 'bg-zinc-900');
  newContent = newContent.replace(/bg-\[#15151A\]/gi, 'bg-zinc-900');
  newContent = newContent.replace(/\bbg-black\b/g, 'bg-zinc-950');
  newContent = newContent.replace(/bg-\[#0a0a0f\]/gi, 'bg-zinc-950');
  newContent = newContent.replace(/bg-\[#09090b\]/gi, 'bg-zinc-950');

  // Also replace some overly dark opacities
  newContent = newContent.replace(/bg-black\/80/g, 'bg-zinc-950/80');
  newContent = newContent.replace(/bg-black\/50/g, 'bg-zinc-950/50');
  newContent = newContent.replace(/bg-\[#0A0A0A\]\/80/gi, 'bg-zinc-950/80');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    count++;
  }
});

console.log(`Updated ${count} files.`);
