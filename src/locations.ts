import type { Data } from './model';

export type LocationEntry = { id: string; person: string; timeId: string; place: string; status: 'tentative' | 'confirmed'; noteIds: string[] };
export type Locations = { transposed?: boolean; people: string[]; times: {id: string; label: string}[]; entries: LocationEntry[] };
export const emptyLocations = (): Locations => ({people: [], times: [], entries: []});
export function locationWords(locations?: Locations): string[] {
  return [...new Set([...(locations?.people ?? []), ...(locations?.entries.map(entry=>entry.place) ?? [])])];
}
export function validateLocations(value: unknown, noteIds: Set<string>): Locations {
  const fail = (): never => { throw new Error('居場所整理の形式が違います。'); };
  if (!value || typeof value !== 'object') return fail();
  const data = value as Locations;
  if(data.transposed !== undefined && typeof data.transposed !== 'boolean')return fail();
  const word = (value: unknown): value is string => typeof value === 'string' && !!value && !/[\s*]/u.test(value);
  if (!Array.isArray(data.people) || !data.people.every(word) || new Set(data.people).size !== data.people.length || !Array.isArray(data.times) || !Array.isArray(data.entries)) return fail();
  const times = new Set<string>(), labels = new Set<string>(), ids = new Set<string>(), cells = new Set<string>();
  for (const time of data.times) {
    if (!time || typeof time.id !== 'string' || !time.id || times.has(time.id) || typeof time.label !== 'string' || !time.label.trim() || time.label !== time.label.trim() || labels.has(time.label)) return fail();
    times.add(time.id); labels.add(time.label);
  }
  for (const entry of data.entries) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) || !data.people.includes(entry.person) || !times.has(entry.timeId) || !word(entry.place) || !['tentative','confirmed'].includes(entry.status) || !Array.isArray(entry.noteIds) || entry.noteIds.some(id=>typeof id !== 'string' || !noteIds.has(id)) || new Set(entry.noteIds).size !== entry.noteIds.length) return fail();
    const key=JSON.stringify([entry.person,entry.timeId,entry.place]); if(cells.has(key))return fail();
    ids.add(entry.id);cells.add(key);
  }
  return {...(data.transposed !== undefined ? {transposed:data.transposed} : {}),people:[...data.people],times:data.times.map(time=>({...time})),entries:data.entries.map(entry=>({...entry,noteIds:[...entry.noteIds]}))};
}
export function locationCell(locations: Locations, person: string, timeId: string) {
  const entries=locations.entries.filter(entry=>entry.person === person && entry.timeId === timeId);
  return {entries, state: entries.length === 0 ? 'unknown' as const : entries.length > 1 ? 'multiple' as const : entries[0].status};
}
export function saveLocation(data: Data, entry: LocationEntry): Data {
  const locations=data.locations ?? emptyLocations();
  if(locations.entries.some(item=>item.id !== entry.id && item.person === entry.person && item.timeId === entry.timeId && item.place === entry.place))throw new Error('この場所は登録済みです。既存の記録を編集してください。');
  const entries=locations.entries.filter(item=>item.id !== entry.id);
  const next={...locations,entries:[...entries,entry]};
  validateLocations(next,new Set(data.notes.map(note=>note.id)));
  return {...data,locations:next};
}
export function remapLocations(locations: Locations | undefined, from: string, to: string): Locations | undefined {
  if (!locations) return undefined;
  const word=(value:string)=>value === from ? to : value;
  const entries: LocationEntry[]=[];
  for(const original of locations.entries) {
    const entry={...original,person:word(original.person),place:word(original.place),noteIds:[...original.noteIds]};
    const existing=entries.find(item=>item.person === entry.person && item.timeId === entry.timeId && item.place === entry.place);
    if(existing){existing.noteIds=[...new Set([...existing.noteIds,...entry.noteIds])];if(entry.status === 'confirmed')existing.status='confirmed';}
    else entries.push(entry);
  }
  return {...locations,people:[...new Set(locations.people.map(word))],entries};
}
export function deleteNote(data: Data, id: string): Data {
  return {...data,notes:data.notes.filter(note=>note.id !== id),noteOrder:data.noteOrder.filter(item=>item !== id),timeline:Object.fromEntries(Object.entries(data.timeline ?? {}).filter(([key])=>key !== id)),...(data.locations ? {locations:{...data.locations,entries:data.locations.entries.map(entry=>({...entry,noteIds:entry.noteIds.filter(item=>item !== id)}))}} : {})};
}
