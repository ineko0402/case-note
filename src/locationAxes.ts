import { completeOrder, keywordCounts, personWords, type Data } from './model.ts';
import { emptyLocations } from './locations.ts';

export type PersonCandidate = {word:string;members:string[];categories:string[];existing:string[]};
export function locationPersonCandidates(data:Data):PersonCandidate[] {
  const order=completeOrder(data.keywordOrder,[...keywordCounts(data).keys()]);
  const existing=data.locations?.people ?? [];
  const seen=new Set<string>();
  const result:PersonCandidate[]=[];
  for(const word of order){
    if(seen.has(word))continue;
    const members=personWords(data,word);
    members.forEach(member=>seen.add(member));
    const rows=existing.filter(person=>members.includes(person));
    result.push({word:rows[0] ?? members[0],members,categories:[...new Set(members.map(member=>data.categories[member]??'未分類'))],existing:rows});
  }
  return result;
}
export function locationTimeKeywords(data:Data):string[] {
  return completeOrder(data.keywordOrder,[...keywordCounts(data).keys()]).filter(word=>data.categories[word] === '時間');
}
export function timeLabelLines(value:string):string[] {
  return [...new Set(value.split(/\r?\n/u).map(label=>label.trim()).filter(Boolean))];
}
export function timeLabelRange(start:string,end:string):string[] {
  start=start.trim();end=end.trim();
  const first=Number(start),last=Number(end);
  if(!/^\d{1,16}$/u.test(start) || !/^\d{1,16}$/u.test(end) || !Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first<0 || last<first || last-first>=1000)throw new Error('開始・終了を0以上の整数で指定してください。一度に1000個まで追加できます。');
  const width=/^0\d/u.test(start) || /^0\d/u.test(end) ? Math.max(start.length,end.length) : 0;
  return Array.from({length:last-first+1},(_,index)=>String(first+index).padStart(width,'0'));
}
/** Append only new axes. Existing rows, time IDs, evidence and records are untouched. */
export function addLocationAxes(data:Data,people:string[],labels:string[],transposed:boolean,makeId:()=>string=()=>crypto.randomUUID()):Data {
  const locations=data.locations ?? emptyLocations();
  const nextPeople=[...locations.people];
  const candidates=locationPersonCandidates(data);
  for(const word of people){
    const candidate=candidates.find(item=>item.members.includes(word));
    if(!candidate)throw new Error('人物のキーワードを選び直してください。');
    if(candidate.members.some(member=>nextPeople.includes(member)))continue;
    nextPeople.push(candidate.word);
  }
  const times=[...locations.times],known=new Set(times.map(time=>time.label)),ids=new Set(times.map(time=>time.id));
  for(const value of labels){
    const label=value.trim();if(!label || known.has(label))continue;
    const id=makeId();if(!id || ids.has(id))throw new Error('時間のIDが重複しました。もう一度お試しください。');
    times.push({id,label});known.add(label);ids.add(id);
  }
  return {...data,locations:{...locations,people:nextPeople,times,transposed}};
}
export function locationCoordinates(row:string,column:string,transposed:boolean):{person:string;timeId:string} {
  return transposed?{person:column,timeId:row}:{person:row,timeId:column};
}
