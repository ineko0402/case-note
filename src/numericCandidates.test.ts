import test from 'node:test';
import assert from 'node:assert/strict';
import { numericCandidates, applyNumericCandidate } from './numericCandidates.ts';
import { emptyData, keywords, validateData, updateNoteText, noteMatches, noteTimes, setTimeline, timelineNotes, sortCategory, addNumbers, applyKeywordClassification } from './model.ts';
import { memoEditReducer, initialMemoEdit } from './useMemoEditing.ts';

test('repeated sequence and person numbers can be registered separately without touching other occurrences',()=>{
 const text='11 に №11 がいた。11';
 const candidates=numericCandidates(text);
 assert.deepEqual(candidates.map(item=>[item.text,item.person]),[['11',false],['№11',true],['11',false]]);
 const person=applyNumericCandidate(text,candidates[1],'person');
 assert.equal(person.text,'11 に *#11 がいた。11');
 assert.deepEqual(person.classification,{word:'#11',category:'ナンバー'});
 const sequence=applyNumericCandidate(person.text,numericCandidates(person.text)[0],'sequence');
 assert.deepEqual(keywords(sequence.text),['11','#11']);
 assert.ok(sequence.text.endsWith('。11'));
 assert.throws(()=>applyNumericCandidate('変更',candidates[0],'sequence'));
 assert.throws(()=>applyNumericCandidate('*11',{text:'11',number:'11',person:false,start:1,end:3},'person'),/キーワード化済み/);
});
test('person notation is normalized while explicit tokens, codes, long numbers and clock times are excluded',()=>{
 const text='#02 ＃03 №04 No.05 No. 06 *11 *#11 11-KI-11 01-AT-2 0900 09:00 123';
 const candidates=numericCandidates(text);
 assert.deepEqual(candidates.map(item=>item.number),['02','03','04','05','06']);
 assert.equal(applyNumericCandidate(text,candidates[4],'person').classification.word,'#06');
});
test('classification never silently overwrites a registered number category',()=>{
 const data={...emptyData,categories:{'11':'ナンバー'}};
 assert.throws(()=>applyKeywordClassification(data,{word:'11',category:'時間'}),/登録済み/);
 const next=applyKeywordClassification(data,{word:'#11',category:'ナンバー'});
 assert.equal(next.categories['11'],'ナンバー');
 assert.equal(next.categories['#11'],'ナンバー');
 assert.throws(()=>applyKeywordClassification({...emptyData,categoryOrder:['未分類']},{word:'11',category:'時間'}));
});
test('titles and draft titles survive backup and search but never supply keywords or timeline candidates',()=>{
 const note={id:'n',title:'11-KI-11 *秘密',text:'*#11 本文',createdAt:'2026-10-13T00:00:00Z'};
 const data={...emptyData,draftTitle:'01-AT-2',notes:[note],categories:{'#11':'ナンバー'}};
 assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))),data);
 assert.equal(noteMatches(note,'ki-11'),true);
 assert.deepEqual(noteTimes(data,note),[]);
 assert.deepEqual(keywords(note.text),['#11']);
 assert.equal(updateNoteText(data,'n','修正','  新しいタイトル  ').notes[0].title,'新しいタイトル');
 assert.throws(()=>validateData({...data,draftTitle:123}));
 assert.throws(()=>validateData({...data,notes:[{...note,title:123}]}));
 assert.deepEqual(validateData(emptyData),emptyData);
});
test('closing and reopening an edit keeps its title and numeric classifications without mutating the note',()=>{
 const note={id:'n',title:'01-AT-2',text:'11',createdAt:'2026-10-13T00:00:00Z'};
 let state=memoEditReducer(initialMemoEdit,{type:'begin',note});
 state=memoEditReducer(state,{type:'title',title:'11-KI-11'});
 state=memoEditReducer(state,{type:'change',text:'*#11',classification:{word:'#11',category:'ナンバー'}});
 state=memoEditReducer(memoEditReducer(state,{type:'close'}),{type:'begin',note});
 assert.equal(state.title,'11-KI-11');
 assert.equal(state.text,'*#11');
 assert.deepEqual(state.classifications,[{word:'#11',category:'ナンバー'}]);
 assert.equal(note.title,'01-AT-2');
 const saved=memoEditReducer(state,{type:'saved'});
 assert.deepEqual(saved.drafts,{});
});
test('sequence timeline values sort numerically, preserve zero padding and ties, and exclude person numbers',()=>{
 const notes=['a','b','c','d'].map((id,i)=>({id,text:['*11 *#11','*02','*2','不明'][i],createdAt:'2026-10-13T00:00:00Z'}));
 const data={...emptyData,notes,categories:{'11':'時間','02':'時間','2':'時間','#11':'ナンバー'},noteOrder:['c','b','a','d']};
 assert.deepEqual(noteTimes(data,notes[0]),['11']);
 const next=notes.reduce((data,note)=>setTimeline(data,note.id,true),data);
 assert.deepEqual(next.timeline,{a:'11',b:'02',c:'2',d:null});
 assert.deepEqual(timelineNotes(next).map(note=>note.id),['c','b','a','d']);
 assert.deepEqual(validateData(next),next);
 assert.throws(()=>setTimeline(next,'a',true,'100'));
 const mixed=setTimeline(next,'d',true,'00:01');
 assert.deepEqual(timelineNotes(mixed).map(note=>note.id),['c','b','a','d']);
});
test('prefixed person numbers sort and bulk-add independently from sequence words',()=>{
 const data={...emptyData,registeredWords:['11'],categories:{'11':'時間'}};
 const next=addNumbers(data,1,12,'#');
 assert.equal(next.categories['11'],'時間'); assert.equal(next.categories['#11'],'ナンバー');
 assert.deepEqual(validateData(next),next);
 assert.deepEqual(sortCategory({...next,keywordOrder:['#12','#2','#1']},'ナンバー').keywordOrder.filter(word=>word.startsWith('#')).slice(0,3),['#1','#2','#3']);
});
