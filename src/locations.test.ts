import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, validateData, renameKeyword, mergeKeywords, keywordCounts, freshData, type Data } from './model.ts';
import { emptyLocations, locationCell, saveLocation, deleteNote, type LocationEntry } from './locations.ts';
const sample = (): Data => ({...structuredClone(emptyData),notes:[{id:'n1',title:'01-AT-2',text:'*#2 *#2 *AT *01',createdAt:'2026-10-31T00:00:00Z'},{id:'n2',text:'*#3 *BI',createdAt:'2026-10-31T00:01:00Z'}],locations:{people:['#2','#3','#4'],times:[{id:'t1',label:'01'},{id:'t2',label:'事件前'}],entries:[]}});
const entry = (overrides: Partial<LocationEntry> = {}): LocationEntry => ({id:'e1',person:'#2',timeId:'t1',place:'AT',status:'tentative',noteIds:['n1'],...overrides});
test('locations are optional, round-trip backups, and never inferred from memo titles or keywords',()=>{
 const data=sample();assert.equal(locationCell(data.locations!,'#2','t1').state,'unknown');
 const saved=saveLocation(data,entry());assert.deepEqual(validateData(JSON.parse(JSON.stringify(saved))),saved);
 assert.equal(validateData(emptyData).locations,undefined);assert.equal(freshData().locations,undefined);
});
test('unknown, tentative, confirmed and multiple places remain distinct without overwriting evidence',()=>{
 const data=saveLocation(sample(),entry());assert.equal(locationCell(data.locations!,'#2','t1').state,'tentative');
 const confirmed=saveLocation(data,entry({status:'confirmed'}));assert.equal(locationCell(confirmed.locations!,'#2','t1').state,'confirmed');
 const multiple=saveLocation(confirmed,entry({id:'e2',place:'BI',noteIds:['n2']}));
 assert.equal(locationCell(multiple.locations!,'#2','t1').state,'multiple');assert.equal(multiple.locations!.entries.length,2);
 assert.equal(locationCell(multiple.locations!,'#3','t1').state,'unknown');assert.equal(data.locations!.entries.length,1);
});
test('reject malformed axes, dangling evidence, duplicate place records and invalid states',()=>{
 for(const next of [entry({person:'absent'}),entry({timeId:'absent'}),entry({place:'two words'}),entry({noteIds:['missing']}),entry({noteIds:['n1','n1']}),entry({status:'wrong' as 'tentative'})])assert.throws(()=>saveLocation(sample(),next));
 const data=saveLocation(sample(),entry());assert.throws(()=>saveLocation(data,entry({id:'e2'})));
 const duplicate=sample();duplicate.locations!.times.push({id:'t3',label:'01'});assert.throws(()=>validateData(duplicate));
 const malformed=sample();malformed.locations!.people.push('#2');assert.throws(()=>validateData(malformed));
});
test('keyword rename follows person and place references without changing time labels',()=>{
 const data=saveLocation(sample(),entry());const person=renameKeyword(data,'#2','#12');
 assert.equal(person.locations!.entries[0].person,'#12');assert.deepEqual(person.locations!.people,['#12','#3','#4']);
 const place=renameKeyword(person,'AT','屋根裏');assert.equal(place.locations!.entries[0].place,'屋根裏');
 assert.equal(place.locations!.times[0].label,'01');assert.doesNotThrow(()=>validateData(place));
});
test('merging people coalesces equal place evidence but retains differing place records',()=>{
 let data=saveLocation(sample(),entry());data=saveLocation(data,entry({id:'e2',person:'#3',status:'confirmed',noteIds:['n2']}));
 data=saveLocation(data,entry({id:'e3',person:'#3',place:'BI',noteIds:[]}));
 const merged=mergeKeywords(data,'#3','#2','ナンバー');assert.deepEqual(merged.locations!.people,['#2','#4']);
 assert.equal(merged.locations!.entries.length,2);assert.equal(merged.locations!.entries[0].status,'confirmed');
 assert.deepEqual(merged.locations!.entries[0].noteIds,['n1','n2']);assert.equal(locationCell(merged.locations!,'#2','t1').state,'multiple');assert.doesNotThrow(()=>validateData(merged));
});
test('deleting a source memo removes only its reference, preserves locations and other evidence',()=>{
 const data=saveLocation(sample(),entry({noteIds:['n1','n2']}));const next=deleteNote(data,'n1');
 assert.deepEqual(next.locations!.entries[0].noteIds,['n2']);assert.equal(next.locations!.entries[0].place,'AT');assert.doesNotThrow(()=>validateData(next));
 const noEvidence=deleteNote(next,'n2');assert.deepEqual(noEvidence.locations!.entries[0].noteIds,[]);assert.equal(keywordCounts(noEvidence).get('AT'),0);assert.equal(keywordCounts(noEvidence).get('#4'),0);
});
test('repeated marked names in one memo count once; location records do not add memo occurrences',()=>{
 const data=saveLocation(sample(),entry());assert.equal(keywordCounts(data).get('#2'),1);assert.equal(keywordCounts(data).get('AT'),1);assert.equal(keywordCounts(data).get('#4'),0);
 assert.deepEqual(emptyLocations(),{people:[],times:[],entries:[]});
});
