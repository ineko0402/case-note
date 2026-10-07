import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const output = resolve('dist');
async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(entry => entry.isDirectory()
    ? filesIn(join(directory, entry.name)) : join(directory, entry.name)));
  return files.flat();
}

const files = (await filesIn(output)).filter(file => relative(output, file) !== 'sw.js').sort();
const template = await readFile(new URL('./sw-template.js', import.meta.url), 'utf8');
const hash = createHash('sha256').update(template);
for (const file of files) hash.update(relative(output, file)).update(await readFile(file));
const revision = hash.digest('hex').slice(0, 16);
const prefix = 'case-note-shell-';
const worker = template
  .replace('__CACHE_PREFIX__', JSON.stringify(prefix))
  .replace('__CACHE_NAME__', JSON.stringify(prefix + revision))
  .replace('__PRECACHE__', JSON.stringify(files.map(file => './' + relative(output, file).replaceAll('\\', '/'))));
await writeFile(join(output, 'sw.js'), worker);
console.log(`Offline shell: ${files.length} files, revision ${revision}`);
