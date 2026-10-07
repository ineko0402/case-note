import './MemoCard.css';
import { SearchField } from './SearchField';
import { Icon } from './Icon';
import './Icon.css';
import { useEffect, useRef, useState } from 'react';
import { TimelineBulk } from './TimelineBulk';
import { KeywordText } from './KeywordText';
import { MemoEditForm } from './MemoEditForm';
import type { MemoEditing } from './useMemoEditing';
import { keywords, personWords, keywordCounts, timelineNotes, type Data } from './model';
import { TimelineSetting } from './TimelineSetting';
import { useSmallScreen } from './useSmallScreen';
export function Timeline({data,update,editor}: {data: Data; update: (data: Data) => void; editor: MemoEditing}) {
 const smallScreen=useSmallScreen();
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
 const {editing}=editor;
 const registered=new Set(keywordCounts(data).keys());
 const notes=timelineNotes(data).filter(note=>note.id === editing || ((!selected || keywords(note.text).some(word=>members.includes(word))) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
 return <main className="workspace timeline-panel" tabIndex={0} aria-label="タイムライン">{smallScreen && editing && <MemoEditForm editor={editor} registered={registered} modal/>}<div className="timeline-tools"><h2>タイムライン <span>{notes.length}</span></h2><div><SearchField label="タイムラインを検索" placeholder="メモを検索" value={search} onChange={setSearch}/><button disabled={editing !== null} onClick={()=>setBulk(true)}>メモを選んで追加</button></div></div>{(selected || search) && <div className="timeline-filter" role="region" aria-label="タイムラインの絞り込み"><span>{selected ? `*${selected} に関連するメモ` : '検索中'} · {notes.length}件</span><button onClick={()=>{setSelected(null);setSearch('');}}>すべて表示</button></div>}{bulk && <dialog ref={bulkDialog} className="settings-dialog timeline-bulk-dialog" aria-label="タイムラインにまとめて追加" onCancel={()=>setBulk(false)}><TimelineBulk data={data} update={update} close={()=>setBulk(false)}/></dialog>}<p className="order-hint">時刻順 · 同時刻は整理順 · 時刻不明は末尾</p>{!notes.length && <p className="muted">{Object.keys(data.timeline ?? {}).length ? '該当するメモはありません。' : 'メモの時計アイコンから、載せるメモを選んでください。'}</p>}<div className="timeline-list">{notes.map(note=><article key={note.id}><div className="timeline-card-heading"><div className="timeline-heading-main"><div className="timeline-time">{data.timeline?.[note.id] ?? '時刻不明'}</div><TimelineSetting note={note} data={data} update={update} showTime={false} disabled={editing !== null}/></div><div className="memo-card-actions"><button type="button" className="icon-button" aria-label="メモを編集" title="メモを編集" disabled={editing !== null} onClick={()=>editor.begin(note)}><Icon name="edit"/></button></div></div>{editing === note.id && !smallScreen ? <MemoEditForm editor={editor} registered={registered} preserveTime/> : <><div className="note-body">{render(note.text)}</div><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></div></>}</article>)}</div></main>;
}
