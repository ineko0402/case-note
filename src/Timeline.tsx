import { SearchField } from './SearchField';
import { Icon } from './Icon';
import './Icon.css';
import { useEffect, useRef, useState } from 'react';
import { TimelineBulk } from './TimelineBulk';
import { KeywordText } from './KeywordText';
import { KeywordEditor } from './KeywordEditor';
import { keywords, personWords, keywordCounts, updateNoteText, timelineNotes, type Data, type Note } from './model';
import { TimelineSetting } from './TimelineSetting';
import { MemoDialog } from './MemoDialog';
import { useSmallScreen } from './useSmallScreen';
export function Timeline({data,update,openGraph}: {openGraph?: (note: Note) => void; data: Data; update: (data: Data) => void}) {
 const smallScreen=useSmallScreen();
 const editDrafts=useRef<Record<string,string>>({});
 function closeEdit(){if(editing)editDrafts.current[editing]=text;setEditing(null);}
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<string | null>(null);
 const members=selected ? personWords(data,selected) : [];
 const related=new Set(members);
 function render(text: string) { return <KeywordText text={text} active={selected} related={related} onSelect={word=>setSelected(previous=>previous===word?null:word)}/>; }
 const [bulk,setBulk]=useState(false);
 const bulkDialog=useRef<HTMLDialogElement>(null);
 useEffect(() => {
  if (!bulk) return;
  const element = bulkDialog.current!;
  const viewport = window.visualViewport;
  function resize() {
   element.style.setProperty('--bulk-vh', (viewport?.height ?? window.innerHeight) + 'px');
   element.style.setProperty('--bulk-vtop', (viewport?.offsetTop ?? 0) + 'px');
  }
  resize(); element.showModal();
  viewport?.addEventListener('resize', resize); viewport?.addEventListener('scroll', resize);
  window.addEventListener('resize', resize);
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
   viewport?.removeEventListener('resize', resize); viewport?.removeEventListener('scroll', resize);
   window.removeEventListener('resize', resize); document.body.style.overflow = previous; element.close();
  };
 }, [bulk]);
 const [editing,setEditing]=useState<string | null>(null);
 const [text,setText]=useState('');
 const registered=new Set(keywordCounts(data).keys());
 function saveEdit() { if (!editing || !text.trim()) return; update(updateNoteText(data,editing,text)); delete editDrafts.current[editing]; setEditing(null); }
 const notes=timelineNotes(data).filter(note=>note.id === editing || ((!selected || keywords(note.text).some(word=>members.includes(word))) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 return <main className="workspace timeline-panel" tabIndex={0} aria-label="タイムライン">{smallScreen && editing && <MemoDialog title="メモを編集" value={text} onChange={setText} registered={registered} submitLabel="保存" submit={saveEdit} close={closeEdit}/>}<div className="timeline-tools"><h2>タイムライン <span>{notes.length}</span></h2><div><SearchField label="タイムラインを検索" placeholder="メモを検索" value={search} onChange={setSearch}/><button disabled={editing !== null} onClick={()=>setBulk(true)}>メモを選んで追加</button></div></div>{(selected || search) && <div className="timeline-filter" role="region" aria-label="タイムラインの絞り込み"><span>{selected ? `*${selected} に関連するメモ` : '検索中'} · {notes.length}件</span><button onClick={()=>{setSelected(null);setSearch('');}}>すべて表示</button></div>}{bulk && <dialog ref={bulkDialog} className="settings-dialog timeline-bulk-dialog" aria-label="タイムラインにまとめて追加" onCancel={()=>setBulk(false)}><TimelineBulk data={data} update={update} close={()=>setBulk(false)}/></dialog>}<p className="order-hint">時刻順 · 同時刻は整理順 · 時刻不明は末尾</p>{!notes.length && <p className="muted">{Object.keys(data.timeline ?? {}).length ? '該当するメモはありません。' : 'メモの時計アイコンから、載せるメモを選んでください。'}</p>}<div className="timeline-list">{notes.map(note=><article key={note.id}><div className="timeline-time">{data.timeline?.[note.id] ?? '時刻不明'}</div>{editing === note.id && !smallScreen ? <form onSubmit={event=>{event.preventDefault();saveEdit();}}><KeywordEditor label="メモを編集" autoFocus value={text} onChange={setText} registered={registered} onSubmitShortcut={saveEdit}/><p className="muted">基準時刻は維持されます。変更する場合は保存後に設定してください。</p><div className="actions"><button type="button" onClick={()=>setEditing(null)}>キャンセル</button><button className="primary" disabled={!text.trim()}>保存</button></div></form> : <><div className="note-body">{render(note.text)}</div><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time><div>{openGraph && <button disabled={editing !== null} onClick={() => openGraph(note)}>このメモを図で見る</button>}<button type="button" className="icon-button" aria-label="メモを編集" title="メモを編集" disabled={editing !== null} onClick={()=>{setEditing(note.id);setText(editDrafts.current[note.id] ?? note.text);}}><Icon name="edit"/></button></div></div><TimelineSetting note={note} data={data} update={update}/></>}</article>)}</div></main>;
}
