import { useEffect, useRef, useState } from 'react';
import { TimelineBulk } from './TimelineBulk';
import { KeywordText } from './KeywordText';
import { KeywordEditor } from './KeywordEditor';
import { keywords, personWords, keywordCounts, updateNoteText, noteTimes, setTimeline, timelineNotes, type Data, type Note } from './model';
import { hasTimeKeyword } from './inputHelp';
export function TimelineSetting({note,data,update}: {note: Note; data: Data; update: (data: Data) => void}) {
 const enabled=Object.hasOwn(data.timeline ?? {},note.id), time=data.timeline?.[note.id] ?? null;
 const candidates=noteTimes(data,note);
 return <details className="timeline-setting"><summary>{enabled ? `タイムライン：${time ?? '時刻不明'}` : hasTimeKeyword(data,note) ? 'タイムラインに表示' : '時刻不明でタイムラインに追加'}</summary><label><input type="checkbox" checked={enabled} onChange={event=>update(setTimeline(data,note.id,event.target.checked))}/>タイムラインに表示</label>{enabled && <><label>基準時刻<input type="time" aria-label="タイムラインの基準時刻" value={time ?? ''} onChange={event=>update(setTimeline(data,note.id,true,event.target.value || null))}/></label>{candidates.length>1 && <p>複数の時刻があります。並べる基準を選んでください。</p>}<div className="time-candidates">{candidates.map(value=><button key={value} type="button" aria-pressed={time===value} onClick={()=>update(setTimeline(data,note.id,true,value))}>{value}</button>)}<button type="button" onClick={()=>update(setTimeline(data,note.id,true,null))}>時刻不明にする</button></div></>}</details>;
}
export function Timeline({data,update,openGraph}: {openGraph?: (note: Note) => void; data: Data; update: (data: Data) => void}) {
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<string | null>(null);
 const members=selected ? personWords(data,selected) : [];
 const related=new Set(members);
 function render(text: string) { return <KeywordText text={text} active={selected} related={related} onSelect={word=>setSelected(previous=>previous===word?null:word)}/>; }
 const [bulk,setBulk]=useState(false);
 const bulkDialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(bulk)bulkDialog.current?.showModal();},[bulk]);
 const [editing,setEditing]=useState<string | null>(null);
 const [text,setText]=useState('');
 const registered=new Set(keywordCounts(data).keys());
 function saveEdit() { if (!editing || !text.trim()) return; update(updateNoteText(data,editing,text)); setEditing(null); }
 const notes=timelineNotes(data).filter(note=>note.id === editing || ((!selected || keywords(note.text).some(word=>members.includes(word))) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 return <main className="workspace timeline-panel" tabIndex={0} aria-label="タイムライン"><div className="list-heading"><h2>タイムライン <span>{notes.length}</span></h2><input type="search" aria-label="タイムラインを検索" placeholder="メモを検索" value={search} onChange={event=>setSearch(event.target.value)}/></div>{(selected || search) && <div className="timeline-filter" role="region" aria-label="タイムラインの絞り込み"><span>{selected ? `*${selected} に関連するメモ` : '検索中'} · {notes.length}件</span><button onClick={()=>{setSelected(null);setSearch('');}}>すべて表示</button></div>}<button disabled={editing !== null} onClick={()=>setBulk(true)}>タイムラインにまとめて追加</button>{bulk && <dialog ref={bulkDialog} className="settings-dialog" aria-label="タイムラインにまとめて追加" onCancel={()=>setBulk(false)}><TimelineBulk data={data} update={update} close={()=>setBulk(false)}/></dialog>}<p className="order-hint">時刻順 · 同時刻は整理順 · 時刻不明は末尾</p>{!notes.length && <p className="muted">{Object.keys(data.timeline ?? {}).length ? '該当するメモはありません。' : 'メモの「タイムラインに表示」から、載せるメモを選んでください。'}</p>}<div className="timeline-list">{notes.map(note=><article key={note.id}><div className="timeline-time">{data.timeline?.[note.id] ?? '時刻不明'}</div>{editing === note.id ? <form onSubmit={event=>{event.preventDefault();saveEdit();}}><KeywordEditor label="メモを編集" autoFocus value={text} onChange={setText} registered={registered} onSubmitShortcut={saveEdit}/><p className="muted">基準時刻は維持されます。変更する場合は保存後に設定してください。</p><div className="actions"><button type="button" onClick={()=>setEditing(null)}>キャンセル</button><button className="primary" disabled={!text.trim()}>保存</button></div></form> : <><div className="note-body">{render(note.text)}</div><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time><div>{openGraph && <button disabled={editing !== null} onClick={() => openGraph(note)}>このメモを図で見る</button>}<button disabled={editing !== null} onClick={()=>{setEditing(note.id);setText(note.text);}}>編集</button></div></div><TimelineSetting note={note} data={data} update={update}/></>}</article>)}</div></main>;
}
