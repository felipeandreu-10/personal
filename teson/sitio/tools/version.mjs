// Pone en cada HTML de public/ el ?v= de los .js y .css según su contenido (md5, 8 caracteres), para que
// el navegador baje la versión nueva cuando un archivo cambia (se cachean un año). Correr antes de publicar:
//   node tools/version.mjs
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const hash = {}, md5 = f => (hash[f] ??= crypto.createHash('md5').update(fs.readFileSync(path.join(root, f))).digest('hex').slice(0, 8));
let changed = 0;
for (const file of walk(root).filter(f => f.endsWith('.html'))) {
  const src = fs.readFileSync(file, 'utf8');
  const out = src.replace(/((?:src|href)=")(\/[^"?]+\.(?:js|css))\?v=[a-f0-9]{8}"/g, (m, a, ref) => fs.existsSync(path.join(root, ref)) ? `${a}${ref}?v=${md5(ref)}"` : m);
  if (out !== src) { fs.writeFileSync(file, out); changed++; console.log('actualizado', path.relative(root, file)); }
}
console.log(changed ? `${changed} páginas actualizadas` : 'todo al día');
