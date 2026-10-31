import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, validateData, renameKeyword, type Data } from './model.ts';
import { addLocationAxes, locationCoordinates, locationPersonCandidates, locationTimeKeywords, timeLabelLines, timeLabelRange } from './locationAxes.ts';
const fixture=():Data=>({...structuredClone(emptyData),registeredWords:['#1','山田','#2','佐藤','ハル','#3','01','02','食堂'],categories:{'#1':'ナンバー',山田:'人物','#2':'ナンバー',佐藤:'人物',ハル:'人物','#3':'ナンバー','01':'時間','02':'時間',食堂:'場所'},links:[{id:'a',a:'#1',b:'山田',kind:'identity',status:'confirmed'},{id:'b',a:'#2',b:'佐藤',kind:'identity',status:'confirmed'},{id:'c',a:'佐藤',b:'ハル',kind:'identity',status:'confirmed'}],notes:[{id:'n',text:'*山田 *食堂',createdAt:'2026-10-31T00:00:00Z'}],locations:{people:['山田'],times:[{id:'t1',label:'01'}],entries:[{id:'e',person:'山田',timeId:'t1',place:'食堂',status:'confirmed',noteIds:['n']}]}});
test('candidate groups combine confirmed names, retain all categories and detect existing aliases',()=>{
 const candidates=locationPersonCandidates(fixture());const existing=candidates.find(item=>item.members.includes('#1'))!;
 assert.equal(existing.word,'山田');assert.deepEqual(existing.existing,['山田']);assert.deepEqual(new Set(existing.categories),new Set(['ナンバー','人物']));
 const newPerson=candidates.find(item=>item.members.includes('ハル'))!;assert.equal(newPerson.word,'#2');assert.equal(newPerson.members.length,3);assert.equal(newPerson.existing.length,0);
 assert.deepEqual(locationTimeKeywords(fixture()),['01','02']);
});
test('bulk addition skips existing people and time labels, deduplicates aliases, and preserves records and time IDs',()=>{
 const original=fixture(),before=structuredClone(original);let id=0;
 const next=addLocationAxes(original,['#1','佐藤','ハル','#3'],['01','02','02',' 事件前 ',''],true,()=>`new-${id++}`);
 assert.deepEqual(next.locations!.people,['山田','#2','#3']);assert.deepEqual(next.locations!.times,[{id:'t1',label:'01'},{id:'new-0',label:'02'},{id:'new-1',label:'事件前'}]);assert.equal(next.locations!.entries,original.locations!.entries);assert.deepEqual(next.locations!.entries,original.locations!.entries);
 assert.deepEqual(original,before);assert.deepEqual(validateData(next),next);
});
test('existing aliases already stored in separate rows are never silently merged',()=>{
 const source=fixture();source.locations!.people.push('#1');source.locations!.entries.push({id:'e2',person:'#1',timeId:'t1',place:'食堂',status:'tentative',noteIds:[]});
 const next=addLocationAxes(source,['#1','山田'],[],false);
 assert.deepEqual(next.locations!.people,['山田','#1']);assert.deepEqual(next.locations!.entries,source.locations!.entries);
});
test('range preserves explicit zero padding, leaves unpadded numbers natural and rejects invalid or excessive ranges',()=>{
 assert.deepEqual(timeLabelRange('01','04'),['01','02','03','04']);assert.deepEqual(timeLabelRange('1','12'),Array.from({length:12},(_,i)=>String(i+1)));assert.deepEqual(timeLabelRange('009','011'),['009','010','011']);assert.deepEqual(timeLabelRange('0','0'),['0']);assert.equal(timeLabelRange('0','999').length,1000);
 for(const [start,end] of [['2','1'],['-1','2'],['1.5','2'],['a','3'],['','3'],['0','1000'],['9007199254740992','9007199254740992']])assert.throws(()=>timeLabelRange(start,end));
 assert.deepEqual(timeLabelLines(' 事件前\r\n\n事件直後\n事件前\n '),['事件前','事件直後']);
});
test('transpose maps each displayed intersection back to the same person and time without rewriting evidence',()=>{
 const source=fixture(),before=structuredClone(source.locations!.entries);
 assert.deepEqual(locationCoordinates('山田','t1',false),{person:'山田',timeId:'t1'});assert.deepEqual(locationCoordinates('t1','山田',true),{person:'山田',timeId:'t1'});
 const turned=addLocationAxes(source,[],[],true);assert.equal(turned.locations!.transposed,true);assert.deepEqual(validateData(JSON.parse(JSON.stringify(turned))),turned);assert.deepEqual(turned.locations!.entries,before);
 const restored=addLocationAxes(turned,[],[],false);assert.equal(restored.locations!.transposed,false);assert.deepEqual(restored.locations!.entries,before);
 assert.equal(validateData(source).locations!.transposed,undefined);assert.throws(()=>validateData({...source,locations:{...source.locations,transposed:'yes'}}));
});
test('rename keeps orientation, and invalid selections or repeated IDs fail without partially changing data',()=>{
 const source=addLocationAxes(fixture(),[],[],true);const renamed=renameKeyword(source,'山田','山田太郎');assert.equal(renamed.locations!.transposed,true);assert.equal(renamed.locations!.entries[0].person,'山田太郎');
 assert.throws(()=>addLocationAxes(source,['missing'],[],false));assert.throws(()=>addLocationAxes(source,[],['02'],false,()=>'t1'));assert.deepEqual(source.locations!.times,[{id:'t1',label:'01'}]);
});
