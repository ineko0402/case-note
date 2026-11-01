import { LocationCellEditor } from './LocationCellEditor';
import { orderedLocationPeople } from './locationPeople';
import { LocationAxisSetup } from './LocationAxisSetup';
import { LocationGrid } from './LocationGrid';
import { useState } from 'react';
import { personWords, type Data } from './model';
import { emptyLocations, locationCell } from './locations';
import './LocationTable.css';

type Props = {data: Data; update: (data: Data) => void; search: string; selected: string | null; clearSelection: () => void};
export function LocationTable({data, update, search, selected, clearSelection}: Props) {
  const locations = data.locations ?? emptyLocations();
  const [settings, setSettings] = useState(false);
  const [target, setTarget] = useState<{person:string;timeId:string} | null>(null);
  const [unknownOnly, setUnknownOnly] = useState(false);
  const [summaryTime, setSummaryTime] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const people = orderedLocationPeople(data,locations.people).filter(person=>(!selected || personWords(data,person).includes(selected) || locations.entries.some(entry=>entry.person === person && entry.place === selected)) && (!query || personWords(data,person).some(word=>word.toLocaleLowerCase().includes(query)) || locations.entries.some(entry=>entry.person === person && entry.place.toLocaleLowerCase().includes(query))) && (!unknownOnly || locations.times.some(time=>locationCell(locations,person,time.id).state === 'unknown')));
  const time = locations.times.find(time=>time.id === summaryTime) ?? locations.times[0];
  const unknown = time ? orderedLocationPeople(data,locations.people).filter(person=>locationCell(locations,person,time.id).state === 'unknown') : [];
  return <section className="location-panel" aria-label="居場所整理">
    <div className="location-heading"><h2>居場所整理</h2><div className="location-heading-actions"><button type="button" aria-pressed={locations.transposed ?? false} onClick={()=>update({...data,locations:{...locations,transposed:!locations.transposed}})}>行列を入れ替え</button><button type="button" onClick={()=>setSettings(true)}>人物・時間を設定</button></div></div>
    {!locations.people.length || !locations.times.length ? <div className="location-empty"><p>人物 {locations.people.length} × 時間 {locations.times.length}</p></div> : <>
      <div className="location-summary"><label>確認する時間<select value={time?.id ?? ''} onChange={event=>setSummaryTime(event.target.value)}>{locations.times.map(time=><option key={time.id} value={time.id}>{time.label}</option>)}</select></label><p><strong>居場所未判明 {unknown.length}人</strong>：{unknown.length ? unknown.map(person=>'*'+person).join('、') : '全員に居場所の記録があります'}</p></div>
      <div className="location-filters"><label><input type="checkbox" checked={unknownOnly} onChange={event=>setUnknownOnly(event.target.checked)}/>未判明の時間がある人物だけ</label></div>
      {selected && <p className="location-selected">*{selected} で絞り込み中 <button type="button" onClick={clearSelection}>絞り込みを解除</button></p>}
      <div className="location-table-scroll" tabIndex={0} role="region" aria-label="人物と時間の居場所表">{people.length>0 && <LocationGrid locations={locations} people={people} transposed={locations.transposed ?? false} onSelect={(person,timeId)=>setTarget({person,timeId})}/>}{!people.length && <p className="muted">条件に一致する人物はいません。</p>}</div>
    </>}
    {settings && <LocationAxisSetup data={data} update={update} close={()=>setSettings(false)}/>}
    {target && <LocationCellEditor key={JSON.stringify(target)} data={data} update={update} person={target.person} timeId={target.timeId} close={()=>setTarget(null)}/>}
  </section>;
}
