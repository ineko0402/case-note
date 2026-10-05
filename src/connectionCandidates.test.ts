import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, connect, type Data } from './model.ts';
import { connectionCandidates, filterConnectionCandidates, initialConnectionOptions } from './connectionCandidates.ts';

function fixture(): Data {
  return {...structuredClone(emptyData), notes: [
    {id: '1', text: '*太郎 *鍵 *鍵 *玄関', createdAt: '2026-10-05'},
    {id: '2', text: '*太郎 *鍵', createdAt: '2026-10-05'},
    {id: '3', text: '*山田太郎 *財布', createdAt: '2026-10-05'},
  ], registeredWords: ['ABC', '9'], categories: {太郎: '人物', 山田太郎: '人物', 鍵: 'アイテム', 財布: 'アイテム', 玄関: '場所', '9': 'ナンバー'}, keywordOrder: ['9', '玄関', '鍵', '太郎', '財布', '山田太郎', 'ABC']};
}

test('shared-note counts use exact tokens and distinct notes, prioritizing shared candidates', () => {
  const result = connectionCandidates(fixture(), '太郎');
  assert.equal(result.some(item => item.word === '太郎'), false);
  assert.deepEqual(result.slice(0, 2).map(item => [item.word, item.sharedNotes]), [['鍵', 2], ['玄関', 1]]);
  assert.equal(result.find(item => item.word === '財布')?.sharedNotes, 0);
  assert.equal(result.find(item => item.word === '山田太郎')?.sharedNotes, 0);
  assert.deepEqual(result.filter(item => !item.sharedNotes).map(item => item.word), ['9', '財布', '山田太郎', 'ABC']);
});

test('connection status is undirected and does not imply links through common notes or peers', () => {
  let data = connect(fixture(), '鍵', '太郎', 'link-1');
  data = connect(data, '鍵', '玄関', 'link-2');
  data.links[0].status = 'confirmed';
  const result = connectionCandidates(data, '太郎');
  assert.equal(result.find(item => item.word === '鍵')?.status, 'confirmed');
  assert.equal(result.find(item => item.word === '玄関')?.status, undefined);
  assert.equal(data.links.length, 2);
});

test('category, search, shared-only and connected filters combine and can be cleared', () => {
  const data = connect(fixture(), '太郎', '鍵', 'link');
  const candidates = connectionCandidates(data, '太郎');
  const options = {...initialConnectionOptions('list'), category: 'アイテム', onlyShared: true};
  assert.deepEqual(filterConnectionCandidates(candidates, options).map(item => item.word), ['鍵']);
  assert.deepEqual(filterConnectionCandidates(candidates, {...options, hideConnected: true}), []);
  assert.deepEqual(filterConnectionCandidates(candidates, {...initialConnectionOptions('memo'), query: ' abC '}).map(item => item.word), ['ABC']);
  assert.deepEqual(filterConnectionCandidates(candidates, {...options, category: '場所'}).map(item => item.word), ['玄関']);
  assert.equal(filterConnectionCandidates(candidates, initialConnectionOptions('list')).length, candidates.length);
});

test('unclassified and registered-only keywords remain candidates without fabricated shared notes', () => {
  const result = connectionCandidates(fixture(), 'ABC');
  assert.equal(result.every(item => item.sharedNotes === 0), true);
  assert.equal(result.find(item => item.word === '9')?.category, 'ナンバー');
  assert.equal(connectionCandidates(fixture(), '太郎').find(item => item.word === 'ABC')?.category, '未分類');
});

test('confirmed identity is not counted as explicit use in the same memo', () => {
  const data = fixture();
  data.links.push({id: 'identity', a: '太郎', b: '9', kind: 'identity', status: 'confirmed'});
  data.notes.push({id: '4', text: '*9 *財布', createdAt: '2026-10-05'});
  const result = connectionCandidates(data, '太郎');
  assert.equal(result.find(item => item.word === '財布')?.sharedNotes, 0);
  assert.equal(result.find(item => item.word === '9')?.status, 'confirmed');
});
