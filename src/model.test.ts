import test from 'node:test';
import assert from 'node:assert/strict';
import { keywords, validateData, emptyData, keywordize } from './model.ts';
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
  assert.equal(migrated.version, 5);
  assert.equal(migrated.categories['6'], 'ナンバー');
  assert.deepEqual(migrated.keywordOrder, []);
  const custom = { ...emptyData, categoryOrder: ['未分類', '証言'], categories: { '6': '証言' }, keywordOrder: ['6'], collapsed: ['証言'] };
  assert.deepEqual(validateData(custom), custom);
  assert.throws(() => validateData({ ...custom, categoryOrder: ['証言'] }));
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
  assert.deepEqual(validateData({...previous,version:2}).noteOrder, []);
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
test('v3 backups keep connections and reject duplicate relationships', async () => {
  const { connect } = await import('./model.ts');
  const data = connect(emptyData, '1', 'A', 'l');
  assert.deepEqual(validateData({...JSON.parse(JSON.stringify(data)),version:3}), data);
  assert.throws(() => validateData({ ...data, links: [...data.links, { id: 'l2', a: 'A', b: '1', status: 'confirmed' }] }));
  const { links, ...old } = emptyData;
  const migrated = validateData({ ...old, version: 2 });
  assert.deepEqual(migrated.links, []);
});
test('batch classification changes only selected unclassified keywords', async () => {
  const { classifyUnassigned } = await import('./model.ts');
  const data = { ...emptyData, categories: { 'A': '人物' } };
  const classified = classifyUnassigned(data, ['1', '6', 'A', '1'], 'ナンバー');
  assert.equal(classified.categories['1'], 'ナンバー');
  assert.equal(classified.categories['6'], 'ナンバー');
  assert.equal(classified.categories['A'], '人物');
  assert.deepEqual(classifyUnassigned(data, ['1'], 'unknown'), data);
});

import { renameKeyword, replaceKeyword } from './model.ts';
test('renaming updates complete tokens and references while keeping order', () => {
  const data = { ...emptyData, notes: [{id:'n',text:'宿泊室A *宿泊室A\n*宿泊室AB *宿泊室A *宿泊室A。',createdAt:'2026-10-03T00:00:00Z'}], draft:'*宿泊室A 本文', categories:{宿泊室A:'場所'},keywordOrder:['宿泊室A','宿泊室AB'],noteOrder:['n'],links:[{id:'l',a:'宿泊室A',b:'1',status:'confirmed' as const}] };
  const next=renameKeyword(data,'宿泊室A','1F北側宿泊室A');
  assert.equal(next.notes[0].text,'宿泊室A *1F北側宿泊室A\n*宿泊室AB *1F北側宿泊室A *宿泊室A。');
  assert.equal(next.draft,'*1F北側宿泊室A 本文');
  assert.deepEqual(next.categories,{'1F北側宿泊室A':'場所'});
  assert.deepEqual(next.keywordOrder,['1F北側宿泊室A','宿泊室AB']);
  assert.deepEqual(next.links,[{id:'l',a:'1F北側宿泊室A',b:'1',status:'confirmed'}]);
  assert.deepEqual(validateData(next),next);
  assert.equal(data.notes[0].text.includes('*1F'),false);
  assert.equal(replaceKeyword('*A *A+B *A','A+B','$&'),'*A *$& *A');
});
test('renaming rejects invalid names and collisions including draft-only keywords', () => {
  const data={...emptyData,notes:[{id:'n',text:'*A *B',createdAt:'2026-10-03T00:00:00Z'}],draft:'*C'};
  for(const name of ['','A','B','C',' A','A B','A\nB','*D']) assert.throws(()=>renameKeyword(data,'A',name));
  assert.throws(()=>renameKeyword(data,'missing','D'));
});

import { keywordCounts, sortCategory, addNumbers, numberCandidates } from './model.ts';
test('category sort is numeric, stable for equal times, and preserves other categories', () => {
 const data={...emptyData,registeredWords:['10','2','1','0900','09:00','0800','2500','名前'],categories:{'10':'ナンバー','2':'ナンバー','1':'ナンバー','0900':'時間','09:00':'時間','0800':'時間','2500':'時間','名前':'人物'},keywordOrder:['10','名前','2','1','0900','09:00','2500','0800']};
 const numbers=sortCategory(data,'ナンバー');assert.deepEqual(numbers.keywordOrder,['1','名前','2','10','0900','09:00','2500','0800']);
 assert.deepEqual(sortCategory(numbers,'時間').keywordOrder,['1','名前','2','10','0800','0900','09:00','2500']);assert.deepEqual(data.keywordOrder,['10','名前','2','1','0900','09:00','2500','0800']);
});
test('bulk numbers skip existing keywords without reclassifying and survive backup and rename', () => {
 const data={...emptyData,notes:[{id:'n',text:'*2',createdAt:'2026-10-03T00:00:00Z'}],categories:{'2':'人物'},draft:'*3'};
 assert.deepEqual(numberCandidates(data,1,4),{added:['1','4'],skipped:2});
 const next=addNumbers(data,1,4);assert.equal(next.categories['2'],'人物');assert.equal(keywordCounts(next).get('1'),0);assert.equal(keywordCounts(next).get('2'),1);
 assert.deepEqual(validateData(next),next);assert.deepEqual(renameKeyword(next,'1','01').registeredWords,['01','4']);assert.deepEqual(keywordCounts(validateData(data)),new Map([['2',1]]));
 for(const [start,end] of [[2,1],[-1,4],[1,1001],[1.5,3],[NaN,3]]) assert.throws(()=>numberCandidates(data,start,end));
 assert.throws(()=>validateData({...next,registeredWords:['1','1']}));assert.throws(()=>validateData({...next,registeredWords:['bad word']}));
});

import { noteTimes, setTimeline, timelineNotes } from './model.ts';
test('timeline is opt-in, inserts late early events, preserves ties and keeps unknowns last', () => {
 const data={...emptyData,notes:[{id:'a',text:'*1000',createdAt:'2026-10-03T00:00:00Z'},{id:'b',text:'*0900',createdAt:'2026-10-03T00:00:00Z'},{id:'c',text:'*0900 *1000',createdAt:'2026-10-03T00:00:00Z'},{id:'d',text:'*0900',createdAt:'2026-10-03T00:00:00Z'}],categories:{'1000':'時間','0900':'時間'},noteOrder:['d','a','b','c']};
 assert.deepEqual(timelineNotes(data),[]);assert.deepEqual(noteTimes(data,data.notes[2]),['09:00','10:00']);
 let next=setTimeline(setTimeline(setTimeline(setTimeline(data,'a',true),'b',true),'c',true),'d',true);
 assert.equal(next.timeline?.c,null);assert.deepEqual(timelineNotes(next).map(n=>n.id),['d','b','a','c']);
 next=setTimeline(next,'c',true,'08:00');assert.deepEqual(timelineNotes(next).map(n=>n.id),['c','d','b','a']);
 assert.deepEqual(validateData(next),next);assert.deepEqual(setTimeline(next,'c',false).timeline,{a:'10:00',b:'09:00',d:'09:00'});
 assert.deepEqual(data.noteOrder,['d','a','b','c']);assert.throws(()=>setTimeline(next,'a',true,'25:00'));assert.throws(()=>validateData({...next,timeline:{missing:'09:00'}}));assert.throws(()=>validateData({...next,timeline:{a:'0900'}}));
});

import { updateNoteText } from './model.ts';
test('editing a timeline memo preserves reference time, identity and other data', () => {
 const data={...emptyData,notes:[{id:'n',text:'*0900 本文',createdAt:'2026-10-03T00:00:00Z'}],timeline:{n:'09:00'},noteOrder:['n']};
 const edited=updateNoteText(data,'n','*1000 修正 *人物');
 assert.equal(edited.notes[0].text,'*1000 修正 *人物');assert.equal(edited.notes[0].createdAt,data.notes[0].createdAt);
 assert.deepEqual(edited.timeline,{n:'09:00'});assert.deepEqual(edited.noteOrder,['n']);assert.deepEqual(validateData(edited),edited);
 assert.deepEqual(keywords(edited.notes[0].text),['1000','人物']);assert.equal(data.notes[0].text,'*0900 本文');assert.equal(updateNoteText(data,'n','  '),data);
});


import { addTimelineNotes } from './model.ts';
test('bulk timeline selection adds only selected notes and preserves existing reference times',()=>{
 const notes=['a','b','c'].map(id=>({id,text:'本文',createdAt:'2026-10-03T00:00:00Z'}));const data={...emptyData,notes,timeline:{a:'10:00'}};
 const next=addTimelineNotes(data,[{id:'a',time:'08:00'},{id:'b',time:null}]);assert.deepEqual(next.timeline,{a:'10:00',b:null});assert.deepEqual(next.notes,data.notes);assert.deepEqual(validateData(next),next);assert.throws(()=>addTimelineNotes(data,[{id:'b',time:'25:00'}]));assert.deepEqual(data.timeline,{a:'10:00'});
});

import { mergeKeywords } from './model.ts';
test('merging consolidates tokens, links and order without changing timeline',()=>{
 const data={...emptyData,notes:[{id:'n',text:'A *A *AB *B',createdAt:'2026-10-03T00:00:00Z'}],draft:'*A',categories:{A:'人物',B:'ナンバー'},keywordOrder:['A','C','B'],registeredWords:['A','B'],timeline:{n:'09:00'},links:[{id:'self',a:'A',b:'B',status:'tentative' as const},{id:'one',a:'A',b:'C',status:'tentative' as const},{id:'two',a:'C',b:'B',status:'confirmed' as const}]};
 const next=mergeKeywords(data,'A','B','人物');
 assert.equal(next.notes[0].text,'A *B *AB *B');
 assert.equal(next.draft,'*B');
 assert.deepEqual(next.categories,{B:'人物'});
 assert.deepEqual(next.keywordOrder,['C','B']);
 assert.deepEqual(next.registeredWords,['B']);
 assert.deepEqual(next.links,[{id:'one',a:'B',b:'C',status:'confirmed'}]);
 assert.deepEqual(next.timeline,data.timeline);
 assert.deepEqual(validateData(next),next);
 assert.equal(data.links[0].id,'self');
 assert.throws(()=>mergeKeywords(data,'A','A','人物'));
 assert.throws(()=>mergeKeywords(data,'A','missing','人物'));
});

import { mergeCandidates } from './model.ts';
test('merge candidates prioritize names containing the source and retain search and stable ordering',()=>{
 const data={...emptyData,registeredWords:['花子','太郎','山田太郎','次郎','太郎さん','佐藤太郎']};
 assert.deepEqual(mergeCandidates(data,'太郎'),['山田太郎','太郎さん','佐藤太郎','花子','次郎']);
 assert.deepEqual(mergeCandidates(data,'太郎','山田'),['山田太郎']);
 assert.deepEqual(mergeCandidates(data,'太郎','花'),['花子']);
 assert.deepEqual(mergeCandidates(data,'花子'),['太郎','山田太郎','次郎','太郎さん','佐藤太郎']);
 assert.deepEqual(mergeCandidates(data,'太郎','存在しない'),[]);
});

import { freshData } from './model.ts';
test('clearing produces independent default data without modifying current data or defaults',()=>{
 const current={...emptyData,notes:[{id:'n',text:'*A',createdAt:'2026-10-03T00:00:00Z'}],registeredWords:['A'],timeline:{n:'09:00'}};
 const cleared=freshData();assert.deepEqual(validateData(cleared),emptyData);assert.equal(keywordCounts(cleared).size,0);assert.equal(cleared.timeline,undefined);assert.equal(cleared.registeredWords,undefined);
 cleared.categoryOrder.push('変更');assert.deepEqual(freshData(),emptyData);assert.equal(current.notes.length,1);assert.deepEqual(current.timeline,{n:'09:00'});
});

import { canIdentify, changeLink, identityConflicts, changeKeywordCategory } from './model.ts';
test('identity confirmation is one-to-one, tentative candidates remain multiple, and replacement is explicit',()=>{
 const data={...emptyData,categories:{'1':'ナンバー','2':'ナンバー',A:'人物',B:'人物',鍵:'アイテム'},links:[{id:'a',a:'1',b:'A',status:'tentative' as const},{id:'b',a:'1',b:'B',status:'tentative' as const},{id:'c',a:'2',b:'A',status:'tentative' as const},{id:'d',a:'1',b:'鍵',status:'confirmed' as const}]};
 const first=changeLink(data,'a','identity','confirmed');assert.equal(first.links[0].kind,'identity');assert.equal(data.links[0].kind,undefined);assert.deepEqual(validateData(first),first);
 const tentative=changeLink(first,'b','identity','tentative');assert.deepEqual(validateData(tentative),tentative);
 assert.equal(identityConflicts(tentative,{...tentative.links[1],status:'confirmed'}).length,1);assert.throws(()=>changeLink(tentative,'b','identity','confirmed'));
 const replaced=changeLink(tentative,'b','identity','confirmed',true);assert.equal(replaced.links[0].status,'tentative');assert.equal(replaced.links[1].status,'confirmed');assert.equal(replaced.links[3].status,'confirmed');assert.deepEqual(validateData(replaced),replaced);
 assert.throws(()=>changeLink(first,'c','identity','confirmed'));assert.throws(()=>changeLink(first,'d','identity','confirmed'));
 assert.equal(canIdentify(first,first.links[3]),false);assert.deepEqual(validateData(data).links,data.links);
 assert.throws(()=>validateData({...first,links:first.links.map(link=>link.id==='b'?{...link,kind:'identity',status:'confirmed'}:link)}));
 assert.throws(()=>validateData({...first,links:[{...first.links[0],kind:'unknown'}]}));
});
test('identity follows rename and category edits, while keyword merges reject ambiguous confirmed identities',()=>{
 const data={...emptyData,registeredWords:['1','2','A','B'],categories:{'1':'ナンバー','2':'ナンバー',A:'人物',B:'人物'},links:[{id:'a',a:'1',b:'A',kind:'identity' as const,status:'confirmed' as const},{id:'b',a:'2',b:'B',kind:'identity' as const,status:'confirmed' as const}]};
 const renamed=renameKeyword(data,'A','太郎');assert.equal(renamed.links[0].kind,'identity');assert.equal(renamed.links[0].b,'太郎');assert.deepEqual(validateData(renamed),renamed);
 assert.deepEqual(validateData(changeKeywordCategory(data,'A','その他')).links,data.links);
 assert.throws(()=>mergeKeywords(data,'1','2','ナンバー'));
 const unconfirmed=changeLink(data,'b','identity','tentative');const merged=mergeKeywords(unconfirmed,'1','2','ナンバー');assert.deepEqual(validateData(merged),merged);assert.equal(merged.links.filter(link=>link.kind==='identity'&&link.status==='confirmed').length,1);
});


test('legacy groups and positions are discarded while live data migrates to v5', () => {
  const expected = {...emptyData, notes:[{id:'n', text:'*1 *山田 *0900', createdAt:'2026-10-07T00:00:00Z'}],
    categories:{'1':'ナンバー',山田:'人物','0900':'時間'}, registeredWords:['1'], keywordOrder:['1','山田'],
    noteOrder:['n'], collapsed:['人物'], draft:'下書き', timeline:{n:'09:00'},
    links:[{id:'l',a:'1',b:'山田',kind:'identity' as const,status:'confirmed' as const}]};
  for (const version of [3,4,5]) {
    const source = {...expected, version, groups:[{id:'g',name:'仲良し'}], board:{cards:[{word:'1',x:100,y:200}]}};
    const migrated=validateData(source);
    assert.deepEqual(migrated,expected);
    assert.equal(Object.hasOwn(migrated,'groups'),false);
    assert.equal(Object.hasOwn(migrated,'board'),false);
    assert.equal(source.version,version);
  }
  assert.deepEqual(validateData({...emptyData,version:4}),emptyData);
  assert.deepEqual(validateData({...emptyData,version:4,groups:'unused',board:null}),emptyData);
  assert.throws(()=>validateData({...emptyData,version:6}));
});

test('category edits preserve current data without legacy group bookkeeping', async () => {
  const {renameCategory,deleteCategory}=await import('./model.ts');
  const data={...emptyData,categories:{'1':'ナンバー'}};
  assert.equal(changeKeywordCategory(data,'1','人物').categories['1'],'人物');
  assert.equal(renameCategory(data,'ナンバー','番号').categories['1'],'番号');
  assert.equal(deleteCategory(data,'ナンバー').categories['1'],'未分類');
});

test('confirmed identity members remain available without board positions', async () => {
  const {personWords}=await import('./model.ts');
  const data={...emptyData,categories:{'1':'ナンバー',山田:'人物'},links:[{id:'l',a:'山田',b:'1',kind:'identity' as const,status:'confirmed' as const}]};
  assert.deepEqual(personWords(data,'山田'),['1','山田']);
  assert.deepEqual(personWords(changeLink(data,'l','identity','tentative'),'山田'),['山田']);
});
