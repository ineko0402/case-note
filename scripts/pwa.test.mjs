import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../dist/sw.js', import.meta.url), 'utf8');
const origin = 'https://ineko0402.github.io';
const root = `${origin}/case-note/`;

function worker({ failInstall = false } = {}) {
  const handlers = {};
  const stores = new Map();
  const network = [];
  const deleted = [];
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(requests) {
          if (failInstall) throw new Error('offline');
          for (const request of requests) {
            assert.equal(request.cache, 'reload');
            entries.set(request.url, new Response(request.url));
          }
        },
        async match(request) { return entries.get(typeof request === 'string' ? request : request.url)?.clone(); }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { deleted.push(name); return stores.delete(name); }
  };
  runInNewContext(source, {
    URL, Request, Set, caches,
    self: { location: { href: `${root}sw.js` }, addEventListener(type, handler) { handlers[type] = handler; } },
    fetch(request) { network.push(request.url); throw new Error('offline'); }
  });
  return {
    stores, network, deleted,
    async lifecycle(type) {
      let promise;
      handlers[type]({ waitUntil(value) { promise = value; } });
      await promise;
    },
    async request(url, mode = 'cors', method = 'GET') {
      let response;
      handlers.fetch({ request: { url, mode, method }, respondWith(value) { response = value; } });
      return await response;
    }
  };
}

test('manifest and built HTML use Pages scope and correctly sized opaque PNG icons', async () => {
  const manifest = JSON.parse(await readFile('dist/manifest.webmanifest', 'utf8'));
  assert.equal(new URL(manifest.start_url, `${root}manifest.webmanifest`).href, root);
  assert.equal(manifest.scope, './');
  assert.equal(manifest.id, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const png = await readFile('dist/' + icon.src);
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
  }
  const html = await readFile('dist/index.html', 'utf8');
  assert.ok(!html.includes('%BASE_URL%'));
  for (const match of html.matchAll(/(?:href|src)="(\/case-note\/[^\"]+)"/g)) {
    await access('dist/' + match[1].slice('/case-note/'.length));
  }
  assert.ok(html.includes('apple-touch-icon'));
});

test('installed shell and every precached asset can load with no network', async () => {
  const sw = worker();
  await sw.lifecycle('install');
  const entries = [...sw.stores.values()][0];
  assert.ok([...entries.keys()].some(url => url.endsWith('.js')));
  assert.ok([...entries.keys()].some(url => url.endsWith('.css')));
  for (const url of entries.keys()) {
    assert.equal(await (await sw.request(url)).text(), url);
    await access('dist/' + new URL(url).pathname.slice('/case-note/'.length));
  }
  assert.equal(await (await sw.request(root + '?test=1', 'navigate')).text(), root + 'index.html');
  assert.equal(await (await sw.request(root + 'index.html', 'navigate')).text(), root + 'index.html');
  assert.deepEqual(sw.network, []);
});

test('worker leaves other projects, external requests, POST and unknown resources alone', async () => {
  const sw = worker();
  for (const [url, mode, method] of [
    [origin + '/other-project/', 'navigate', 'GET'],
    ['https://example.com/image.png', 'cors', 'GET'],
    [root, 'navigate', 'POST'],
    [root + 'not-cached.json', 'cors', 'GET']
  ]) assert.equal(await sw.request(url, mode, method), undefined);
});

test('activation removes only old Case Note shell caches and never forces an active editor update', async () => {
  const sw = worker();
  await sw.lifecycle('install');
  const active = [...sw.stores.keys()][0];
  sw.stores.set('case-note-shell-old', new Map());
  sw.stores.set('another-app-shell', new Map());
  await sw.lifecycle('activate');
  assert.ok(sw.stores.has(active));
  assert.ok(sw.stores.has('another-app-shell'));
  assert.deepEqual(sw.deleted, ['case-note-shell-old']);
  assert.ok(!source.includes('skipWaiting'));
  assert.ok(!source.includes('clients.claim'));
  assert.ok(!source.includes('indexedDB'));
});

test('failed install removes its incomplete cache without deleting the previous version', async () => {
  const sw = worker({ failInstall: true });
  sw.stores.set('case-note-shell-old', new Map());
  await assert.rejects(sw.lifecycle('install'), /offline/);
  assert.deepEqual([...sw.stores.keys()], ['case-note-shell-old']);
});
