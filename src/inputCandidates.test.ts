import test from 'node:test';
import assert from 'node:assert/strict';
import { inputCandidates } from './inputCandidates.ts';
import { keywordize, keywords } from './model.ts';

test('space-separated candidates distinguish registered and new names',()=>{
  const result=inputCandidates('太郎 鍵',new Set(['太郎']));
  assert.deepEqual(result.map(item=>[item.word,item.registered]),[['太郎',true],['鍵',false]]);
});
test('brackets supply exact ranges without converting an ordinary sentence',()=>{
  const text='太郎は（鍵）を見つけた。「図書室」に行く。';
  const result=inputCandidates(text,new Set());
  assert.deepEqual(result.map(item=>item.word),['鍵','図書室']);
  for(const item of result)assert.equal(text.slice(item.ranges[0].start,item.ranges[0].end),item.word);
  assert.deepEqual(inputCandidates('普通の文章です。',new Set()),[]);
});
test('existing marked keywords are excluded and repeated plain words are grouped',()=>{
  const result=inputCandidates('*太郎 太郎 太郎',new Set(['太郎']));
  assert.equal(result.length,1);
  assert.deepEqual(result[0].ranges.map(range=>range.start),[4,7]);
});
test('backwards replacement preserves brackets and untouched sentence text',()=>{
  const text='(太郎) [鍵] は部屋にいる。';
  let next=text;
  for(const range of inputCandidates(text,new Set()).filter(item=>item.word==='太郎'||item.word==='鍵').flatMap(item=>item.ranges).sort((a,b)=>b.start-a.start))next=keywordize(next,range.start,range.end,false).text;
  assert.deepEqual(keywords(next),['太郎','鍵']);
  assert.ok(next.includes('は部屋にいる。'));
  assert.ok(next.includes(')')&&next.includes(']'));
});
