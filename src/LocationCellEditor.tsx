import { useEffect, useRef, useState } from 'react';
import type { Data } from './model';
import type { LocationEntry } from './locations';
import { locationEvidenceNotes, locationPlaceCandidates, quickSetLocation } from './locationQuickEntry';
import { SearchField } from './SearchField';
import './LocationQuickEntry.css';

type Props={data:Data;update:(data:Data)=>void;person:string;timeId:string;close:()=>void};
export function LocationCellEditor({data,update,person,timeId,close}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current!;element.showModal();return ()=>element.close();},[]);
  const entries=data.locations?.entries.filter(entry=>entry.person === person && entry.timeId === timeId) ?? [];
  const initial=entries.length===1?entries[0]:undefined;
  const [editingId,setEditingId]=useState<string|undefined>(initial?.id);
  const [adding,setAdding]=useState(entries.length>1);
  const [status,setStatus]=useState<LocationEntry['status']>(initial?.status ?? 'tentative');
  const [noteIds,setNoteIds]=useState<string[]>(initial?.noteIds ?? []);
  const [category,setCategory]=useState(Object.values(data.categories).includes('場所')?'場所':'');
  const [placeSearch,setPlaceSearch]=useState('');
  const [scope,setScope]=useState<'time'|'person'|'all'>('time');
  const [noteSearch,setNoteSearch]=useState('');
  const [openNote,setOpenNote]=useState<string|null>(null);
  const [error,setError]=useState('');
  const query=placeSearch.trim().toLocaleLowerCase();
  const places=locationPlaceCandidates(data,category).filter(candidate=>candidate.members.some(word=>word.toLocaleLowerCase().includes(query)));
  const current=entries.find(entry=>entry.id === editingId);
  const notes=locationEvidenceNotes(data,timeId,person,scope,noteSearch);
  const selectedNotes=data.notes.filter(note=>noteIds.includes(note.id));
  const evidence=data.notes.find(note=>note.id === openNote);
  const time=data.locations?.times.find(time=>time.id === timeId);
  function choosePlace(word:string,members:string[]) {
    // Preserve a stored alias when the selected button already represents that place.
    if(adding && entries.some(entry=>members.includes(entry.place))){close();return;}
    const place=current && members.includes(current.place)?current.place:word;
    try{update(quickSetLocation(data,person,timeId,place,{entryId:editingId,add:adding,status,noteIds}));close();}
    catch(reason){setError((reason as Error).message);}
  }
  function edit(entry:LocationEntry){setEditingId(entry.id);setAdding(false);setStatus(entry.status);setNoteIds(entry.noteIds);setError('');}
  function addNew(){setEditingId(undefined);setAdding(true);setStatus('tentative');setNoteIds([]);setError('');}
  return <dialog ref={dialog} className="settings-dialog location-dialog location-quick-dialog" aria-label="居場所を選択" onCancel={close}><section className="category-settings">
    <div className="list-heading"><h2>*{person} ／ {time?.label}</h2><button type="button" onClick={close}>閉じる</button></div>
    <div className="location-place-controls"><label>分類<select aria-label="場所候補の分類" value={category} onChange={event=>setCategory(event.target.value)}><option value="">すべて</option>{data.categoryOrder.map(item=><option key={item}>{item}</option>)}</select></label><SearchField label="場所を検索" placeholder="場所を検索" value={placeSearch} onChange={setPlaceSearch}/></div>
    <div className="location-place-buttons" aria-label="場所の選択">{places.map(candidate=><button type="button" key={candidate.word} aria-pressed={!adding && !!current && candidate.members.includes(current.place)} onClick={()=>choosePlace(candidate.word,candidate.members)}><span>{candidate.word}</span>{candidate.members.length>1 && <small>{candidate.members.filter(word=>word !== candidate.word).join(' · ')}</small>}</button>)}</div>
    {!places.length && <p className="muted">候補なし</p>}
    {error && <p role="alert">{error}</p>}
    <details className="location-quick-evidence"><summary>根拠メモ {noteIds.length}件</summary>
      {selectedNotes.length>0 && <div className="location-selected-evidence">{selectedNotes.map(note=><div key={note.id}><button type="button" onClick={()=>setOpenNote(note.id)}>{note.title || note.text.slice(0,40)}</button><button type="button" aria-label={`${note.title || '選択したメモ'}を根拠から外す`} onClick={()=>setNoteIds(previous=>previous.filter(id=>id !== note.id))}>×</button></div>)}</div>}
      {evidence && <article className="location-note"><div className="list-heading"><h3>{evidence.title || 'タイトルなし'}</h3><button type="button" onClick={()=>setOpenNote(null)}>閉じる</button></div><p>{evidence.text}</p></article>}
      <div className="location-evidence-filters"><label>表示<select aria-label="根拠メモの表示範囲" value={scope} onChange={event=>setScope(event.target.value as typeof scope)}><option value="time">この時間</option><option value="person">この人物</option><option value="all">すべて</option></select></label><SearchField label="根拠メモを検索" placeholder="タイトル・本文を検索" value={noteSearch} onChange={setNoteSearch}/><span>{notes.length}件</span></div>
      <div className="location-evidence-candidates">{notes.map(note=><article key={note.id}><label><input type="checkbox" checked={noteIds.includes(note.id)} onChange={event=>setNoteIds(previous=>event.target.checked?[...previous,note.id]:previous.filter(id=>id !== note.id))}/><span>{note.title || note.text.slice(0,60)}</span></label><details><summary>本文</summary><p>{note.text}</p></details></article>)}{!notes.length && <p className="muted">該当なし</p>}</div>
      {current && <div className="actions"><button type="button" onClick={()=>choosePlace(current.place,[current.place])}>根拠を保存</button></div>}
    </details>
    <details className="location-quick-details" open={entries.length>1 || undefined}><summary>記録の詳細{entries.length>0?` ${entries.length}件`:''}</summary>
      <div className="location-quick-status"><label>状態<select value={status} onChange={event=>setStatus(event.target.value as LocationEntry['status'])}><option value="tentative">仮</option><option value="confirmed">確定</option></select></label>{entries.length>0 && <button type="button" aria-pressed={adding} onClick={addNew}>別の場所を追加</button>}</div>
      {current && <button type="button" onClick={()=>choosePlace(current.place,[current.place])}>変更を保存</button>}
      <div className="location-existing-records">{entries.map(entry=><div key={entry.id}><button type="button" aria-pressed={editingId === entry.id} onClick={()=>edit(entry)}>{entry.place} · {entry.status === 'confirmed'?'確定':'仮'}</button><button type="button" onClick={()=>{if(!window.confirm('この居場所の記録を削除しますか？ 根拠メモは残ります。'))return;update({...data,locations:{...data.locations!,entries:data.locations!.entries.filter(item=>item.id !== entry.id)}});if(editingId===entry.id)addNew();}}>削除</button></div>)}</div>
    </details>
  </section></dialog>;
}
