import test from 'node:test';
import assert from 'node:assert/strict';
import { keywords, validateData, emptyData } from './model.ts';
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
