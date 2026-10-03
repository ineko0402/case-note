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
  assert.equal(migrated.version, 4);
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
test('placing and removing cards leaves notes, connections and groups intact', async () => {
  const { placeCard, removeCard, connect } = await import('./model.ts');
  const linked = connect(emptyData, '1', 'A', 'l');
  const placed = placeCard(placeCard(linked, '1', 50, 80), 'A', 300, -20);
  assert.equal(placed.board.cards.length, 2);
  assert.deepEqual(placeCard(placed, '1', 999, 999), placed);
  const removed = removeCard(placed, '1');
  assert.equal(removed.board.cards.length, 1);
  assert.deepEqual(removed.links, linked.links);
  assert.deepEqual(removed.notes, linked.notes);
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(placed))), placed);
});
test('older backups start with an empty board and invalid positions are rejected', () => {
  const { board, ...older } = emptyData;
  const migrated = validateData({ ...older, version: 3 });
  assert.deepEqual(migrated.board.cards, []);
  assert.throws(() => validateData({ ...emptyData, board: { ...board, cards: [{ word: '1', x: Infinity, y: 0 }] } }));
  assert.throws(() => validateData({ ...emptyData, board: { ...board, viewport: { x: 0, y: 0, zoom: 0 } } }));
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
test('board context includes co-occurring and directly linked keywords without inferred links', async () => {
  const { contextWords, connect } = await import('./model.ts');
  const data = connect({ ...emptyData, notes: [{ id: 'n', text: '*1 *食堂 *鍵', createdAt: new Date().toISOString() }] }, '1', 'A', 'l');
  assert.deepEqual([...contextWords(data, '1')!].sort(), ['1', 'A', '食堂', '鍵'].sort());
  assert.equal(contextWords(data, null), null);
  assert.equal(data.links.length, 1);
});

import { renameKeyword, replaceKeyword } from './model.ts';
test('renaming updates complete tokens and all references while keeping positions and order', () => {
  const data = { ...emptyData, notes: [{id:'n',text:'宿泊室A *宿泊室A\n*宿泊室AB *宿泊室A *宿泊室A。',createdAt:'2026-10-03T00:00:00Z'}], draft:'*宿泊室A 本文', categories:{宿泊室A:'場所'},keywordOrder:['宿泊室A','宿泊室AB'],noteOrder:['n'],links:[{id:'l',a:'宿泊室A',b:'1',status:'confirmed' as const}],groups:[{id:'g',name:'北側',category:'場所',members:['宿泊室A'],collapsed:false}],board:{cards:[{word:'宿泊室A',x:20,y:30}],viewport:{x:10,y:20,zoom:1}} };
  const next=renameKeyword(data,'宿泊室A','1F北側宿泊室A');
  assert.equal(next.notes[0].text,'宿泊室A *1F北側宿泊室A\n*宿泊室AB *1F北側宿泊室A *宿泊室A。');
  assert.equal(next.draft,'*1F北側宿泊室A 本文');
  assert.deepEqual(next.categories,{'1F北側宿泊室A':'場所'});
  assert.deepEqual(next.keywordOrder,['1F北側宿泊室A','宿泊室AB']);
  assert.deepEqual(next.links,[{id:'l',a:'1F北側宿泊室A',b:'1',status:'confirmed'}]);
  assert.deepEqual(next.groups[0].members,['1F北側宿泊室A']);
  assert.deepEqual(next.board.cards,[{word:'1F北側宿泊室A',x:20,y:30}]);
  assert.deepEqual(next.board.viewport,data.board.viewport);
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

import { placeMemoWords } from './model.ts';
test('memo diagram places unique missing cards and preserves existing cards and relationships',()=>{
 const data={...emptyData,board:{cards:[{word:'A',x:20,y:30}],viewport:{x:0,y:0,zoom:1}},links:[{id:'l',a:'A',b:'B',status:'confirmed' as const}]};
 const next=placeMemoWords(data,['A','B','B','C']);assert.equal(next.board.cards.length,3);assert.deepEqual(next.board.cards[0],data.board.cards[0]);assert.deepEqual(next.links,data.links);assert.deepEqual(placeMemoWords(next,['B','C']).board,next.board);assert.ok(next.board.cards[1].x>20);assert.deepEqual(data.board.cards,[{word:'A',x:20,y:30}]);
});
