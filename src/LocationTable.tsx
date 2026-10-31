import { useEffect, useRef, useState } from 'react';
import { keywordCounts, completeOrder, type Data } from './model';
import { emptyLocations, locationCell, saveLocation, type Locations, type LocationEntry } from './locations';
import './LocationTable.css';

type Props = {data: Data; update: (data: Data) => void; search: string; selected: string | null; clearSelection: () => void};
export function LocationTable({data, update, search, selected, clearSelection}: Props) {
  const locations = data.locations ?? emptyLocations();
  const [settings, setSettings] = useState(false);
  const [target, setTarget] = useState<{person:string;timeId:string} | null>(null);
  const [unknownOnly, setUnknownOnly] = useState(false);
  const [summaryTime, setSummaryTime] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const people = locations.people.filter(person=>(!selected || person === selected || locations.entries.some(entry=>entry.person === person && entry.place === selected)) && (!query || person.toLocaleLowerCase().includes(query) || locations.entries.some(entry=>entry.person === person && entry.place.toLocaleLowerCase().includes(query))) && (!unknownOnly || locations.times.some(time=>locationCell(locations,person,time.id).state === 'unknown')));
  const time = locations.times.find(time=>time.id === summaryTime) ?? locations.times[0];
  const unknown = time ? locations.people.filter(person=>locationCell(locations,person,time.id).state === 'unknown') : [];
  return <section className="location-panel" aria-label="居場所整理">
    <div className="location-heading"><h2>居場所整理</h2><button type="button" onClick={()=>setSettings(true)}>人物・時間を設定</button></div>
    {!locations.people.length || !locations.times.length ? <div className="location-empty"><p>人物を行、時間を列にして、居場所を見渡せます。</p><p>「人物・時間を設定」で確認したい人物と時間を追加してください。場所はセルを押して登録します。</p><p>人物と場所には登録済みのキーワードを使います。時間は「01」「午後3時」「事件前」など自由に設定できます。</p></div> : <>
      <div className="location-summary"><label>確認する時間<select value={time?.id ?? ''} onChange={event=>setSummaryTime(event.target.value)}>{locations.times.map(time=><option key={time.id} value={time.id}>{time.label}</option>)}</select></label><p><strong>居場所未判明 {unknown.length}人</strong>：{unknown.length ? unknown.map(person=>'*'+person).join('、') : '全員に居場所の記録があります'}</p></div>
      <div className="location-filters"><label><input type="checkbox" checked={unknownOnly} onChange={event=>setUnknownOnly(event.target.checked)}/>未判明の時間がある人物だけ</label><span>？ 未判明 ／ 仮 ／ 確定 ／ 複数の記録</span></div>
      {selected && <p className="location-selected">*{selected} で絞り込み中 <button type="button" onClick={clearSelection}>絞り込みを解除</button></p>}
      <div className="location-table-scroll" tabIndex={0} role="region" aria-label="人物と時間の居場所表"><table className="location-table"><caption>人物ごとの居場所。セルを押すと場所と根拠メモを登録・確認できます。</caption><thead><tr><th scope="col">人物＼時間</th>{locations.times.map(time=><th scope="col" key={time.id}>{time.label}</th>)}</tr></thead><tbody>{people.map(person=><tr key={person}><th scope="row">*{person}</th>{locations.times.map(time=>{
        const cell=locationCell(locations,person,time.id);
        return <td key={time.id} className={'location-cell '+cell.state}><button type="button" aria-label={`${person}・${time.label}：${cell.entries.length ? cell.entries.map(entry=>`${entry.place}・${entry.status === 'confirmed' ? '確定' : '仮'}`).join('、') : '居場所未判明'}`} onClick={()=>setTarget({person,timeId:time.id})}>{cell.state === 'unknown' ? <><strong>？</strong><span>未判明</span></> : <>{cell.entries.map(entry=><span key={entry.id} className="location-value">{entry.place}<small>{entry.status === 'confirmed' ? '確定' : '仮'}{entry.noteIds.length ? ` · 根拠${entry.noteIds.length}件` : ''}</small></span>)}{cell.state === 'multiple' && <small className="location-warning">複数の記録</small>}</>}</button></td>;
      })}</tr>)}</tbody></table>{!people.length && <p className="muted">条件に一致する人物はいません。</p>}</div>
      <p className="location-help">未判明は「いなかった」という意味ではありません。仮の記録は未判明と区別し、複数の場所がある場合は上書きせず並べます。</p>
    </>}
    {settings && <LocationSetup data={data} update={update} close={()=>setSettings(false)}/>}
    {target && <LocationCellEditor key={JSON.stringify(target)} data={data} update={update} person={target.person} timeId={target.timeId} close={()=>setTarget(null)}/>}
  </section>;
}

function useModal() {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current!;dialog.showModal();return ()=>dialog.close();},[]);
  return ref;
}
function LocationSetup({data,update,close}:{data:Data;update:(data:Data)=>void;close:()=>void}) {
  const dialog=useModal();
  const locations=data.locations ?? emptyLocations();
  const words=completeOrder(data.keywordOrder,[...keywordCounts(data).keys()]);
  const candidates=words.filter(word=>!locations.people.includes(word)).sort((a,b)=>Number(!['人物','ナンバー'].includes(data.categories[a]))-Number(!['人物','ナンバー'].includes(data.categories[b])));
  const [person,setPerson]=useState('');
  const [label,setLabel]=useState('');
  const [error,setError]=useState('');
  function apply(next:Locations){update({...data,locations:next});setError('');}
  function move<T>(items:T[],index:number,direction:number) {const result=[...items];[result[index],result[index+direction]]=[result[index+direction],result[index]];return result;}
  return <dialog ref={dialog} className="settings-dialog location-dialog" aria-label="人物・時間を設定" onCancel={close}><section className="category-settings"><div className="list-heading"><h2>人物・時間を設定</h2><button type="button" onClick={close}>閉じる</button></div><p>登場していない人物も行に追加すると、情報がないことを確認できます。入力した内容は自動保存されます。</p>
    <h3>人物（行）</h3><form className="location-add" onSubmit={event=>{event.preventDefault();if(!candidates.includes(person))return;apply({...locations,people:[...locations.people,person]});setPerson('');}}><select aria-label="追加する人物" value={person} onChange={event=>setPerson(event.target.value)}><option value="">キーワードを選択</option>{candidates.map(word=><option key={word} value={word}>*{word}（{data.categories[word] ?? '未分類'}）</option>)}</select><button disabled={!candidates.includes(person)}>人物を追加</button></form>{!words.length && <p className="muted">先にメモからキーワードを登録してください。人物番号は分類設定でまとめて追加できます。</p>}
    <ul className="location-axis-list">{locations.people.map((word,index)=><li key={word}><span>*{word}</span><button type="button" aria-label={`${word}を上へ`} disabled={index === 0} onClick={()=>apply({...locations,people:move(locations.people,index,-1)})}>↑</button><button type="button" aria-label={`${word}を下へ`} disabled={index === locations.people.length-1} onClick={()=>apply({...locations,people:move(locations.people,index,1)})}>↓</button><button type="button" onClick={()=>{if(locations.entries.some(entry=>entry.person === word) && !window.confirm(`「${word}」の行と居場所の記録を削除します。キーワードと根拠メモは残ります。よろしいですか？`))return;apply({...locations,people:locations.people.filter(item=>item !== word),entries:locations.entries.filter(entry=>entry.person !== word)});}}>行を削除</button></li>)}</ul>
    <h3>時間（列）</h3><form className="location-add" onSubmit={event=>{event.preventDefault();const next=label.trim();if(!next || locations.times.some(time=>time.label === next)){setError('時間の名前は空欄や重複にできません。');return;}apply({...locations,times:[...locations.times,{id:crypto.randomUUID(),label:next}]});setLabel('');}}><input aria-label="追加する時間" placeholder="01、午後3時、事件前など" value={label} onChange={event=>setLabel(event.target.value)}/><button disabled={!label.trim()}>時間を追加</button></form>
    <ul className="location-axis-list">{locations.times.map((time,index)=><li key={time.id}><span>{time.label}</span><button type="button" aria-label={`${time.label}を左へ`} disabled={index === 0} onClick={()=>apply({...locations,times:move(locations.times,index,-1)})}>←</button><button type="button" aria-label={`${time.label}を右へ`} disabled={index === locations.times.length-1} onClick={()=>apply({...locations,times:move(locations.times,index,1)})}>→</button><button type="button" onClick={()=>{if(locations.entries.some(entry=>entry.timeId === time.id) && !window.confirm(`「${time.label}」の列と居場所の記録を削除します。根拠メモは残ります。よろしいですか？`))return;apply({...locations,times:locations.times.filter(item=>item.id !== time.id),entries:locations.entries.filter(entry=>entry.timeId !== time.id)});}}>列を削除</button></li>)}</ul><p role="alert">{error}</p>
  </section></dialog>;
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
    <p className="muted">場所は明示的に登録します。本文やメモタイトルからの自動判定はしません。</p>
    <div className="location-records">{!entries.length && <p>居場所は未判明です。</p>}{entries.map(entry=><section key={entry.id}><div><strong>{entry.place}</strong>〈{entry.status === 'confirmed' ? '確定' : '仮'}〉<button type="button" onClick={()=>{setEditing(entry.id);setPlace(entry.place);setStatus(entry.status);setNoteIds(entry.noteIds);setError('');}}>編集</button><button type="button" onClick={()=>{if(!window.confirm('この居場所の記録を削除しますか？ 根拠メモは残ります。'))return;update({...data,locations:{...locations,entries:locations.entries.filter(item=>item.id !== entry.id)}});if(editing === entry.id)reset();}}>記録を削除</button></div><div className="location-evidence">{entry.noteIds.map(id=>{const note=data.notes.find(note=>note.id === id);return note && <button type="button" key={id} onClick={()=>setOpenNote(id)}>{note.title || note.text.slice(0,40)}</button>;})}{!entry.noteIds.length && <small>根拠メモなし</small>}</div></section>)}</div>
    {entries.length > 1 && <p className="location-warning">複数の場所が記録されています。根拠を比較して確認してください。</p>}
    {evidence && <section className="location-note"><div className="list-heading"><h3>根拠メモ：{evidence.title || 'タイトルなし'}</h3><button type="button" onClick={()=>setOpenNote(null)}>メモを閉じる</button></div><p>{evidence.text}</p></section>}
    <form className="location-entry-form" onSubmit={event=>{event.preventDefault();try{if(!places.includes(place))throw new Error('場所を選んでください。');update(saveLocation(data,{id:editing ?? crypto.randomUUID(),person,timeId,place,status,noteIds}));reset();}catch(reason){setError((reason as Error).message);}}}>
      <h3>{editing ? '居場所の記録を編集' : '居場所の記録を追加'}</h3><div className="location-entry-fields"><label>場所<select value={place} onChange={event=>setPlace(event.target.value)} required><option value="">キーワードを選択</option>{places.map(word=><option key={word} value={word}>{word}（{data.categories[word] ?? '未分類'}）</option>)}</select></label><label>状態<select value={status} onChange={event=>setStatus(event.target.value as LocationEntry['status'])}><option value="tentative">仮</option><option value="confirmed">確定</option></select></label></div>
      <fieldset><legend>根拠メモ（任意・複数選択可）</legend><input type="search" aria-label="根拠メモを検索" placeholder="タイトル・本文を検索" value={noteSearch} onChange={event=>setNoteSearch(event.target.value)}/><div className="location-note-options">{notes.map(note=><label key={note.id}><input type="checkbox" checked={noteIds.includes(note.id)} onChange={event=>setNoteIds(event.target.checked ? [...noteIds,note.id] : noteIds.filter(id=>id !== note.id))}/><span>{note.title || note.text.slice(0,60)}</span></label>)}{!notes.length && <p className="muted">該当するメモはありません。</p>}</div></fieldset><p role="alert">{error}</p><div className="actions">{editing && <button type="button" onClick={reset}>編集をやめる</button>}<button className="primary" disabled={!place}>{editing ? '変更を保存' : '記録を追加'}</button></div>
    </form>
  </section></dialog>;
}
