import { LocationAxisSetup } from './LocationAxisSetup';
import { LocationGrid } from './LocationGrid';
import { useEffect, useRef, useState } from 'react';
import { keywordCounts, personWords, type Data } from './model';
import { emptyLocations, locationCell, saveLocation, type LocationEntry } from './locations';
import './LocationTable.css';

type Props = {data: Data; update: (data: Data) => void; search: string; selected: string | null; clearSelection: () => void};
export function LocationTable({data, update, search, selected, clearSelection}: Props) {
  const locations = data.locations ?? emptyLocations();
  const [settings, setSettings] = useState(false);
  const [target, setTarget] = useState<{person:string;timeId:string} | null>(null);
  const [unknownOnly, setUnknownOnly] = useState(false);
  const [summaryTime, setSummaryTime] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const people = locations.people.filter(person=>(!selected || personWords(data,person).includes(selected) || locations.entries.some(entry=>entry.person === person && entry.place === selected)) && (!query || personWords(data,person).some(word=>word.toLocaleLowerCase().includes(query)) || locations.entries.some(entry=>entry.person === person && entry.place.toLocaleLowerCase().includes(query))) && (!unknownOnly || locations.times.some(time=>locationCell(locations,person,time.id).state === 'unknown')));
  const time = locations.times.find(time=>time.id === summaryTime) ?? locations.times[0];
  const unknown = time ? locations.people.filter(person=>locationCell(locations,person,time.id).state === 'unknown') : [];
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

function useModal() {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current!;dialog.showModal();return ()=>dialog.close();},[]);
  return ref;
}
function LocationCellEditor({data,update,person,timeId,close}:{data:Data;update:(data:Data)=>void;person:string;timeId:string;close:()=>void}) {
  const dialog=useModal();
  const locations=data.locations ?? emptyLocations();
  const entries=locationCell(locations,person,timeId).entries;
  const [editing,setEditing]=useState<string | null>(null);
  const [place,setPlace]=useState('');
  const [status,setStatus]=useState<LocationEntry['status']>('tentative');
  const [noteIds,setNoteIds]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [noteSearch,setNoteSearch]=useState('');
  const places=[...keywordCounts(data).keys()].sort((a,b)=>Number(data.categories[a] !== '場所')-Number(data.categories[b] !== '場所'));
  const [openNote,setOpenNote]=useState<string | null>(null);
  const evidence=data.notes.find(note=>note.id === openNote);
  const notes=data.notes.filter(note=>noteIds.includes(note.id) || `${note.title ?? ''}\n${note.text}`.toLocaleLowerCase().includes(noteSearch.toLocaleLowerCase()));
  function reset(){setEditing(null);setPlace('');setStatus('tentative');setNoteIds([]);setError('');}
  return <dialog ref={dialog} className="settings-dialog location-dialog" aria-label="居場所を登録・確認" onCancel={close}><section className="category-settings"><div className="list-heading"><h2>*{person} ／ {locations.times.find(time=>time.id === timeId)?.label}</h2><button type="button" onClick={close}>閉じる</button></div>
    <div className="location-records">{!entries.length && <p>記録なし</p>}{entries.map(entry=><section key={entry.id}><div><strong>{entry.place}</strong>〈{entry.status === 'confirmed' ? '確定' : '仮'}〉<button type="button" onClick={()=>{setEditing(entry.id);setPlace(entry.place);setStatus(entry.status);setNoteIds(entry.noteIds);setError('');}}>編集</button><button type="button" onClick={()=>{if(!window.confirm('この居場所の記録を削除しますか？ 根拠メモは残ります。'))return;update({...data,locations:{...locations,entries:locations.entries.filter(item=>item.id !== entry.id)}});if(editing === entry.id)reset();}}>記録を削除</button></div><div className="location-evidence">{entry.noteIds.map(id=>{const note=data.notes.find(note=>note.id === id);return note && <button type="button" key={id} onClick={()=>setOpenNote(id)}>{note.title || note.text.slice(0,40)}</button>;})}{!entry.noteIds.length && <small>根拠メモなし</small>}</div></section>)}</div>
    {entries.length > 1 && <p className="location-warning">複数の場所が記録されています。根拠を比較して確認してください。</p>}
    {evidence && <section className="location-note"><div className="list-heading"><h3>根拠メモ：{evidence.title || 'タイトルなし'}</h3><button type="button" onClick={()=>setOpenNote(null)}>メモを閉じる</button></div><p>{evidence.text}</p></section>}
    <form className="location-entry-form" onSubmit={event=>{event.preventDefault();try{if(!places.includes(place))throw new Error('場所を選んでください。');update(saveLocation(data,{id:editing ?? crypto.randomUUID(),person,timeId,place,status,noteIds}));reset();}catch(reason){setError((reason as Error).message);}}}>
      <h3>{editing ? '居場所の記録を編集' : '居場所の記録を追加'}</h3><div className="location-entry-fields"><label>場所<select value={place} onChange={event=>setPlace(event.target.value)} required><option value="">キーワードを選択</option>{places.map(word=><option key={word} value={word}>{word}（{data.categories[word] ?? '未分類'}）</option>)}</select></label><label>状態<select value={status} onChange={event=>setStatus(event.target.value as LocationEntry['status'])}><option value="tentative">仮</option><option value="confirmed">確定</option></select></label></div>
      <fieldset><legend>根拠メモ（任意・複数選択可）</legend><input type="search" aria-label="根拠メモを検索" placeholder="タイトル・本文を検索" value={noteSearch} onChange={event=>setNoteSearch(event.target.value)}/><div className="location-note-options">{notes.map(note=><label key={note.id}><input type="checkbox" checked={noteIds.includes(note.id)} onChange={event=>setNoteIds(event.target.checked ? [...noteIds,note.id] : noteIds.filter(id=>id !== note.id))}/><span>{note.title || note.text.slice(0,60)}</span></label>)}{!notes.length && <p className="muted">該当するメモはありません。</p>}</div></fieldset><p role="alert">{error}</p><div className="actions">{editing && <button type="button" onClick={reset}>編集をやめる</button>}<button className="primary" disabled={!place}>{editing ? '変更を保存' : '記録を追加'}</button></div>
    </form>
  </section></dialog>;
}
