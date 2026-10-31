import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, personWords, groupedConnections, connectionPreviews, changeLink, validateData, renameKeyword, mergeKeywords, type Data } from './model.ts';
import { unmarkKeyword } from './keywordOccurrence.ts';
const data=():Data=>({...structuredClone(emptyData),registeredWords:['A','B','C','候補','食堂','ピアノの部屋'],links:[{id:'ab',a:'A',b:'B',kind:'identity',status:'confirmed'},{id:'bc',a:'B',b:'C',kind:'identity',status:'confirmed'},{id:'cq',a:'C',b:'候補',kind:'identity',status:'tentative'},{id:'room',a:'食堂',b:'ピアノの部屋',kind:'identity',status:'confirmed'},{id:'a-room',a:'A',b:'食堂',kind:'related',status:'tentative'},{id:'c-room',a:'C',b:'ピアノの部屋',kind:'related',status:'confirmed'}]});
test('confirmed aliases are transitive and external relationships group without inventing links or joining tentative aliases',()=>{
 const source=data();assert.deepEqual(personWords(source,'C'),['A','B','C']);assert.deepEqual(personWords(source,'候補'),['候補']);
 const relations=groupedConnections(source,'B');assert.equal(relations.length,2);assert.equal(relations.find(group=>group.members.includes('食堂'))!.links.length,2);assert.equal(source.links.length,6);assert.deepEqual(validateData(source),source);
});
test('changing confirmed alias evidence splits groups; an alternate confirmed path keeps equivalence',()=>{
 const source=data();const split=changeLink(source,'bc','identity','tentative');assert.deepEqual(personWords(split,'C'),['C']);assert.deepEqual(personWords(split,'A'),['A','B']);
 const cycle={...source,links:[...source.links,{id:'ac',a:'A',b:'C',kind:'identity' as const,status:'confirmed' as const}]};assert.deepEqual(personWords(changeLink(cycle,'bc','related','tentative'),'C'),['A','B','C']);
});
test('alias groups survive backup, rename and keyword consolidation with no ordinary text rewrite',()=>{
 const source={...data(),notes:[{id:'n',text:'*A A *B *C',createdAt:'2026-10-31T00:00:00Z'}]};const renamed=renameKeyword(source,'B','別名');assert.equal(renamed.notes[0].text,'*A A *別名 *C');assert.equal(personWords(renamed,'C').length,3);
 const merged=mergeKeywords(renamed,'別名','A','人物');assert.equal(personWords(merged,'C').length,2);assert.deepEqual(validateData(JSON.parse(JSON.stringify(merged))),merged);
});
test('unmark affects the exact clicked occurrence and preserves other occurrences, notes, titles and metadata',()=>{
 const text='😀 *A\n*A　*A';const source={...data(),notes:[{id:'n',title:'*A',text,createdAt:'2026-10-31T00:00:00Z'},{id:'other',text:'*A',createdAt:'2026-10-31T00:00:00Z'}],timeline:{n:'01'},draft:'*A'};
 const start=text.indexOf('*A',text.indexOf('*A')+1);const next=unmarkKeyword(source,'A',{noteId:'n',start,text});
 assert.equal(next.notes[0].text,'😀 *A\nA　*A');assert.equal(next.notes[1].text,'*A');assert.equal(next.notes[0].title,'*A');assert.deepEqual(next.links,source.links);assert.deepEqual(next.timeline,source.timeline);assert.equal(next.draft,'*A');assert.deepEqual(validateData(next),next);assert.equal(source.notes[0].text,text);
});
test('unmark refuses stale notes, wrong offsets and prefix matches and keeps last-use keywords registered',()=>{
 const source={...structuredClone(emptyData),notes:[{id:'n',text:'*A *AB',createdAt:'2026-10-31T00:00:00Z'}]};
 for(const occurrence of [{noteId:'missing',start:0,text:'*A *AB'},{noteId:'n',start:0,text:'stale'},{noteId:'n',start:1,text:'*A *AB'},{noteId:'n',start:3,text:'*A *AB'}])assert.throws(()=>unmarkKeyword(source,'A',occurrence));
 const next=unmarkKeyword(source,'A',{noteId:'n',start:0,text:'*A *AB'});assert.deepEqual(next.registeredWords,['A']);assert.equal(next.notes[0].text,'A *AB');assert.deepEqual(validateData(next),next);
});

test('a confirmed relationship never turns a tentative alias candidate into a confirmed alias in previews',()=>{
 const source=data();source.links.push({id:'q-related',a:'A',b:'候補',kind:'related',status:'confirmed'});
 const previews=connectionPreviews(source,'B').filter(item=>item.word === '候補');
 assert(previews.some(item=>item.kind === 'related' && item.status === 'confirmed'));
 assert(previews.some(item=>item.kind === 'identity' && item.status === 'tentative'));
 assert(!previews.some(item=>item.kind === 'identity' && item.status === 'confirmed'));
});
