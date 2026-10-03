import test from 'node:test';
import assert from 'node:assert/strict';
import { keywords, validateData, emptyData, keywordize, moveBefore } from './model.ts';
test('extracts explicit keywords without interpreting number or time', () => {
  assert.deepEqual(keywords('*1810 *夜 *6 本文 *6\n*食堂　*2'), ['1810', '夜', '6', '食堂', '2']);
});
test('does not split joined words or parse ordinary prose', () => {
  assert.deepEqual(keywords('*13厨房 本文1810 a*b *'), ['13厨房']);
});
test('validates backup and rejects duplicate IDs and invalid categories', () => {
  assert.deepEqual(validateData(emptyData), emptyData);
  assert.throws(() => validateData({ ...emptyData, categories: { '6': 'invalid' } }));
  const note = { id: '1', text: '*6', createdAt: new Date().toISOString() };
  assert.throws(() => validateData({ ...emptyData, notes: [note, note] }));
});

test('converts selection and supplies boundaries without doubling marker', () => {
  assert.equal(keywordize('食堂で夜', 3, 4, false).text, '食堂で *夜');
  assert.equal(keywordize('*食堂', 1, 3, false).text, '*食堂');
  assert.equal(keywordize('監視室 カードキー', 0, 9, false).text, '*監視室 *カードキー');
  assert.equal(keywordize('監視室 カードキー', 0, 9, true).text, '*監視室カードキー');
  assert.equal(keywordize('食堂\n夜', 0, 4, false).text, '*食堂 *夜');
});
test('migrates old backup and preserves customized version 2 settings', () => {
  const old = { version: 1, notes: [], categories: { '6': 'ナンバー' }, draft: '*夜' };
  const migrated = validateData(old);
  assert.equal(migrated.version, 3);
  assert.equal(migrated.categories['6'], 'ナンバー');
  assert.deepEqual(migrated.keywordOrder, []);
  const custom = { ...emptyData, categoryOrder: ['未分類', '証言'], categories: { '6': '証言' }, keywordOrder: ['6'], collapsed: ['証言'] };
  assert.deepEqual(validateData(custom), custom);
  assert.throws(() => validateData({ ...custom, categoryOrder: ['証言'] }));
});
test('moves an item before target and keeps other ordering intact', () => {
  assert.deepEqual(moveBefore(['a', 'b', 'c'], 'c', 'a'), ['c', 'a', 'b']);
});
test('organized note order stays separate from registration and filtered moves preserve hidden notes', async () => {
  const { completeOrder, moveRelative } = await import('./model.ts');
  const registration = ['a', 'b', 'c', 'd'];
  const order = moveRelative(registration, 'd', 'b', false);
  assert.deepEqual(order, ['a', 'd', 'b', 'c']);
  assert.deepEqual(registration, ['a', 'b', 'c', 'd']);
  assert.deepEqual(moveRelative(order, 'a', 'c', true), ['d', 'b', 'c', 'a']);
  assert.deepEqual(completeOrder(['d', 'deleted'], registration), ['d', 'a', 'b', 'c']);
});
test('v2 backups without organized note order load with registration order', () => {
  const { noteOrder, ...previous } = emptyData;
  assert.deepEqual(validateData(previous).noteOrder, []);
  assert.throws(() => validateData({ ...emptyData, noteOrder: ['a', 'a'] }));
});
test('connections are undirected, many-to-many, tentative and do not propagate', async () => {
  const { connect } = await import('./model.ts');
  let data = connect(emptyData, '1', 'A', 'one');
  data = connect(data, '1', '鍵', 'two');
  assert.equal(data.links.length, 2);
  assert.equal(data.links[0].status, 'tentative');
  assert.deepEqual(connect(data, 'A', '1', 'duplicate'), data);
  assert.deepEqual(connect(data, '1', '1', 'self'), data);
  assert.equal(data.links.some(link => link.a === 'A' && link.b === '鍵'), false);
});
test('group memberships remain inside category and follow category rename/deletion', async () => {
  const { changeKeywordCategory, renameCategory, deleteCategory } = await import('./model.ts');
  const data = { ...emptyData, categories: { '1': 'ナンバー', '6': 'ナンバー' }, groups: [
    { id: 'g1', name: '仲良し', category: 'ナンバー', members: ['1', '6'], collapsed: false },
    { id: 'g2', name: '兄弟', category: 'ナンバー', members: ['1'], collapsed: true }
  ] };
  assert.deepEqual(validateData(data), data);
  const changed = changeKeywordCategory(data, '1', '人物');
  assert.deepEqual(changed.groups.map(group => group.members), [['6'], []]);
  assert.equal(renameCategory(data, 'ナンバー', '番号').groups[0].category, '番号');
  assert.equal(deleteCategory(data, 'ナンバー').groups.length, 0);
  assert.equal(deleteCategory(data, 'ナンバー').categories['1'], '未分類');
  assert.throws(() => validateData({ ...data, categories: { '1': '人物' } }));
});
test('v3 backups keep connections and groups and reject duplicate relationships', async () => {
  const { connect } = await import('./model.ts');
  const data = connect(emptyData, '1', 'A', 'l');
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))), data);
  assert.throws(() => validateData({ ...data, links: [...data.links, { id: 'l2', a: 'A', b: '1', status: 'confirmed' }] }));
  const { links, groups, ...old } = emptyData;
  const migrated = validateData({ ...old, version: 2 });
  assert.deepEqual(migrated.links, []);
  assert.deepEqual(migrated.groups, []);
});
