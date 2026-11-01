import { completeOrder, keywordCounts, keywords, personWords, type Data, type Note } from './model.ts';
import { saveLocation, type LocationEntry } from './locations.ts';

type QuickOptions={entryId?:string;add?:boolean;status?:LocationEntry['status'];noteIds?:string[]};
export function quickSetLocation(data:Data,person:string,timeId:string,place:string,options:QuickOptions={},makeId:()=>string=()=>crypto.randomUUID()):Data {
  if(!keywordCounts(data).has(place))throw new Error('場所のキーワードを選び直してください。');
  const entries=data.locations?.entries.filter(entry=>entry.person === person && entry.timeId === timeId) ?? [];
  if(options.add && !options.entryId && entries.some(entry=>entry.place === place))return data;
  const target=options.entryId?entries.find(entry=>entry.id === options.entryId):!options.add && entries.length===1?entries[0]:entries.find(entry=>entry.place === place);
  if(options.entryId && !target)throw new Error('記録が変更されました。セルを開き直してください。');
  return saveLocation(data,{id:target?.id ?? makeId(),person,timeId,place,status:options.status ?? target?.status ?? 'tentative',noteIds:options.noteIds ?? target?.noteIds ?? []});
}
export type PlaceCandidate={word:string;members:string[]};
export function locationPlaceCandidates(data:Data,category:string):PlaceCandidate[] {
  const words=completeOrder(data.keywordOrder,[...keywordCounts(data).keys()]);
  const seen=new Set<string>(),result:PlaceCandidate[]=[];
  for(const word of words){
    if(seen.has(word))continue;
    const members=personWords(data,word);members.forEach(member=>seen.add(member));
    const matching=members.filter(member=>!category || data.categories[member]===category);
    if(matching.length)result.push({word:matching[0],members});
  }
  return result.sort((a,b)=>a.word.localeCompare(b.word,'ja',{numeric:true}));
}
function sameTime(a:string,b:string):boolean {
  if(a===b)return true;
  if(/^\d+$/u.test(a) && /^\d+$/u.test(b))return Number.isSafeInteger(Number(a)) && Number(a)===Number(b);
  const clock=(value:string)=>/^(?:[01]\d|2[0-3]):?[0-5]\d$/u.test(value)?value.replace(':',''):null;
  return clock(a)!==null && clock(a)===clock(b);
}
/** Only explicit time metadata or time-classified tokens may supply a time match. */
export function locationNoteMatchesTime(data:Data,note:Note,label:string):boolean {
  const reference=data.timeline?.[note.id];
  return (typeof reference==='string' && sameTime(reference,label)) || keywords(note.text).some(word=>data.categories[word]==='時間' && sameTime(word,label));
}
export function locationEvidenceNotes(data:Data,timeId:string,person:string,scope:'time'|'person'|'all',search=''):Note[] {
  const time=data.locations?.times.find(time=>time.id === timeId);
  const members=personWords(data,person),query=search.trim().toLocaleLowerCase();
  return data.notes.filter(note=>(scope==='all' || (scope==='time'?!!time && locationNoteMatchesTime(data,note,time.label):keywords(note.text).some(word=>members.includes(word)))) && `${note.title??''}\n${note.text}`.toLocaleLowerCase().includes(query));
}
