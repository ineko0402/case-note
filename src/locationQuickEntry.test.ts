import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, validateData, type Data } from './model.ts';
import { orderedLocationPeople, sortLocationPeople } from './locationPeople.ts';
import { locationPersonCandidates } from './locationAxes.ts';
import { quickSetLocation, locationPlaceCandidates, locationEvidenceNotes, locationNoteMatchesTime } from './locationQuickEntry.ts';
const fixture=():Data=>({...structuredClone(emptyData),registeredWords:['#11','#2','Eddie','#1','食堂','ピアノの部屋','屋根裏'],categories:{'#11':'ナンバー','#2':'ナンバー',Eddie:'人物','#1':'ナンバー',食堂:'場所',ピアノの部屋:'場所',屋根裏:'場所'},links:[{id:'alias',a:'#2',b:'Eddie',kind:'identity',status:'confirmed'},{id:'room',a:'食堂',b:'ピアノの部屋',kind:'identity',status:'confirmed'}],notes:[{id:'evidence',text:'*Eddie',createdAt:'2026-11-01T00:00:00Z'}],locations:{people:['#11','Eddie','#1'],times:[{id:'t',label:'01'}],entries:[]}});
test('people and candidate groups sort by numeric identity, including stored aliases; manual order remains available',()=>{
 const data=fixture();assert.deepEqual(orderedLocationPeople(data,data.locations!.people),['#1','Eddie','#11']);assert.deepEqual(data.locations!.people,['#11','Eddie','#1']);
 const manually={...data,locations:{...data.locations!,manualPeopleOrder:true}};assert.deepEqual(orderedLocationPeople(manually,manually.locations.people),['#11','Eddie','#1']);assert.deepEqual(validateData(manually),manually);
 assert.deepEqual(sortLocationPeople(data,['#11','#2','#1']),['#1','#2','#11']);
 const selected=locationPersonCandidates(data).filter(item=>item.categories.includes('ナンバー'));assert.deepEqual(selected.map(item=>item.word),['#1','Eddie','#11']);
 assert.throws(()=>validateData({...data,locations:{...data.locations,manualPeopleOrder:'yes'}}));
});
test('one place press creates a record and changing a single existing place preserves its ID, status and evidence',()=>{
 const data=fixture();const created=quickSetLocation(data,'#1','t','食堂',{},()=>'new');assert.equal(created.locations!.entries[0].status,'tentative');assert.equal(data.locations!.entries.length,0);
 const confirmed=quickSetLocation(created,'#1','t','食堂',{status:'confirmed',noteIds:['evidence']});const changed=quickSetLocation(confirmed,'#1','t','屋根裏');
 assert.deepEqual(changed.locations!.entries,[{id:'new',person:'#1',timeId:'t',place:'屋根裏',status:'confirmed',noteIds:['evidence']}]);assert.deepEqual(validateData(changed),changed);
});
test('additional locations preserve conflicting records; selecting an existing place in add mode never clears its metadata',()=>{
 const source=quickSetLocation(fixture(),'#1','t','食堂',{status:'confirmed',noteIds:['evidence']},()=>'first');
 const multiple=quickSetLocation(source,'#1','t','屋根裏',{add:true},()=>'second');assert.equal(multiple.locations!.entries.length,2);assert.deepEqual(multiple.locations!.entries[0],source.locations!.entries[0]);
 const unchanged=quickSetLocation(multiple,'#1','t','食堂',{add:true,status:'tentative',noteIds:[]});assert.equal(unchanged,multiple);
 const edited=quickSetLocation(multiple,'#1','t','食堂',{entryId:'first',status:'tentative'});assert.equal(edited.locations!.entries.find(entry=>entry.id==='first')!.status,'tentative');assert.equal(edited.locations!.entries.find(entry=>entry.id==='second')!.place,'屋根裏');
 assert.throws(()=>quickSetLocation(multiple,'#1','t','食堂',{entryId:'missing'}));assert.throws(()=>quickSetLocation(multiple,'#1','t','missing'));
});
test('place buttons group aliases and use classifications without turning people into place candidates',()=>{
 const places=locationPlaceCandidates(fixture(),'場所');assert.equal(places.length,2);assert(places.some(item=>item.members.includes('食堂') && item.members.includes('ピアノの部屋')));assert(!places.some(item=>item.word==='#1'));
});
test('evidence defaults to explicit time metadata or time-classified tokens, never person numbers or filename guesses',()=>{
 const data=fixture();data.categories['1']='時間';data.categories['09:00']='時間';data.categories['事件前']='時間';data.notes=[
 {id:'same',text:'*1 *Eddie',createdAt:'2026-11-01T00:00:00Z'},
 {id:'person',title:'01-AT-1',text:'*#1',createdAt:'2026-11-01T00:00:00Z'},
 {id:'timeline',text:'別の人物',createdAt:'2026-11-01T00:00:00Z'},
 {id:'clock',text:'*09:00',createdAt:'2026-11-01T00:00:00Z'},
 {id:'label',text:'*事件前',createdAt:'2026-11-01T00:00:00Z'}];data.timeline={timeline:'01'};
 assert.deepEqual(locationEvidenceNotes(data,'t','#2','time').map(note=>note.id),['same','timeline']);assert.deepEqual(locationEvidenceNotes(data,'t','#2','person').map(note=>note.id),['same']);assert.equal(locationEvidenceNotes(data,'t','#2','all').length,5);
 assert.equal(locationEvidenceNotes(data,'t','#2','time','別の人物').length,1);assert.equal(locationNoteMatchesTime(data,data.notes[3],'0900'),true);assert.equal(locationNoteMatchesTime(data,data.notes[4],'事件前'),true);assert.equal(locationNoteMatchesTime(data,data.notes[1],'01'),false);assert.equal(locationNoteMatchesTime(data,data.notes[3],'09'),false);
});
