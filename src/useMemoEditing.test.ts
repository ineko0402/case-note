import test from 'node:test';
import assert from 'node:assert/strict';
import { memoEditReducer, initialMemoEdit } from './useMemoEditing.ts';
const note = { id: 'n', text: '元の本文', createdAt: '2026-10-07T00:00:00Z' };

test('closing keeps an unsaved draft and reopening resumes it without changing the memo', () => {
  const opened = memoEditReducer(initialMemoEdit, { type: 'begin', note });
  const changed = memoEditReducer(opened, { type: 'change', text: '未保存の修正' });
  const closed = memoEditReducer(changed, { type: 'close' });
  assert.equal(closed.editing, null);
  assert.equal(memoEditReducer(closed, { type: 'begin', note }).text, '未保存の修正');
  assert.equal(note.text, '元の本文');
  assert.deepEqual(initialMemoEdit.drafts, {});
});

test('empty drafts are retained and a second memo cannot replace an active edit', () => {
  const changed = memoEditReducer(memoEditReducer(initialMemoEdit, { type: 'begin', note }), { type: 'change', text: '' });
  assert.equal(memoEditReducer(changed, { type: 'begin', note: { ...note, id: 'other' } }), changed);
  assert.equal(memoEditReducer(memoEditReducer(changed, { type: 'close' }), { type: 'begin', note }).text, '');
  assert.equal(memoEditReducer(initialMemoEdit, { type: 'begin', note: { ...note, id: 'constructor' } }).text, note.text);
});

test('saving clears only the current draft so future edits start from the saved text', () => {
  const state = { editing: 'n', text: '保存内容', drafts: { n: '古い下書き', other: '別の未保存文' } };
  const saved = memoEditReducer(state, { type: 'saved' });
  assert.deepEqual(saved.drafts, { other: '別の未保存文' });
  assert.equal(memoEditReducer(saved, { type: 'begin', note: { ...note, text: '保存内容' } }).text, '保存内容');
  assert.equal(state.drafts.n, '古い下書き');
});

test('replacing data resets active edits and all temporary drafts', () => {
  const state = { editing: 'n', text: '修正', drafts: { n: '未保存' } };
  assert.deepEqual(memoEditReducer(state, { type: 'reset' }), initialMemoEdit);
  assert.equal(memoEditReducer(initialMemoEdit, { type: 'change', text: '入力なし' }), initialMemoEdit);
});
