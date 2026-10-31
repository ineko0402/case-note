import { noteMatches } from './model';
import './MemoCard.css';
import { SearchField } from './SearchField';
import { Icon } from './Icon';
import './Icon.css';
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { TimelineBulk } from './TimelineBulk';
import { KeywordText } from './KeywordText';
import type { KeywordInspection } from './KeywordHover';
import { MemoEditForm } from './MemoEditForm';
import type { MemoEditing } from './useMemoEditing';
import { keywords, personWords, keywordCounts, timelineNotes, type Data } from './model';
import { TimelineSetting } from './TimelineSetting';
import { useSmallScreen } from './useSmallScreen';
export function Timeline({keywordSearch = '', data,update,editor, filterKeyword: selected, setFilterKeyword: setSelected, actionNote, selectMemo, onKeyword, onResetFilter, closeActions, inspection}: {keywordSearch?: string; data: Data; update: (data: Data) => void; editor: MemoEditing; filterKeyword: string | null; setFilterKeyword: Dispatch<SetStateAction<string | null>>; actionNote: string | null; selectMemo: (id: string) => void; onKeyword: (word: string) => void; onResetFilter: () => void; closeActions: () => void; inspection?:KeywordInspection}) {
 const smallScreen=useSmallScreen();
 const [search,setSearch]=useState('');
 const members=selected ? personWords(data,selected) : [];
 const related=new Set(members);
 function render(text: string,noteId:string) { return <KeywordText text={text} noteId={noteId} inspection={inspection} active={inspection?.active ?? selected} related={related} onSelect={word=>{setSelected(previous=>smallScreen?word:previous===word?null:word);if(smallScreen)onKeyword(word);}}/>; }
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
 const notes=timelineNotes(data).filter(note=>note.id === editing || ((!selected || keywords(note.text).some(word=>members.includes(word))) && noteMatches(note,search) && (!keywordSearch.trim() || keywords(note.text).some(word=>word.toLocaleLowerCase().includes(keywordSearch.trim().toLocaleLowerCase())))));
 return <main className="workspace timeline-panel" tabIndex={0} aria-label="タイムライン">{smallScreen && editing && <MemoEditForm editor={editor} registered={registered} modal/>}<div className="timeline-tools"><h2>タイムライン <span>{notes.length}</span></h2><div>{smallScreen && <SearchField label="タイムラインを検索" placeholder="メモを検索" value={search} onChange={value=>{setSearch(value);closeActions();}}/>}<button disabled={editing !== null} onClick={()=>setBulk(true)}>メモを選んで追加</button></div></div>{(selected || search || keywordSearch.trim()) && <div className="timeline-filter" role="region" aria-label="タイムラインの絞り込み"><span>{selected ? `*${selected} に関連するメモ` : '検索中'} · {notes.length}件</span><button onClick={()=>{setSelected(null);setSearch('');onResetFilter();}}>すべて表示</button></div>}{bulk && <dialog ref={bulkDialog} className="settings-dialog timeline-bulk-dialog" aria-label="タイムラインにまとめて追加" onCancel={()=>setBulk(false)}><TimelineBulk data={data} update={update} close={()=>setBulk(false)}/></dialog>}<p className="order-hint">時系列番号・時刻順 · 同じ位置は整理順 · 不明は末尾{smallScreen && ' · メモをタップして操作'}</p>{!notes.length && <p className="muted">{Object.keys(data.timeline ?? {}).length ? '該当するメモはありません。' : 'メモの時計アイコンから、載せるメモを選んでください。'}</p>}<div className="timeline-list">{notes.map(note=><article key={note.id} className={smallScreen ? 'mobile-memo-card'+(actionNote === note.id ? ' is-action-target' : '') : undefined} onClick={event=>{if(!smallScreen || editing !== null || (event.target as HTMLElement).closest('button,a,input,select,textarea') || window.getSelection()?.isCollapsed === false)return;selectMemo(note.id);}}><div className="timeline-card-heading"><div className="timeline-heading-main"><div className="timeline-time">{data.timeline?.[note.id] ?? '時刻不明'}</div>{!smallScreen && <TimelineSetting note={note} data={data} update={update} showTime={false} disabled={editing !== null}/>}</div>{!smallScreen && <div className="memo-card-actions"><button type="button" className="icon-button" aria-label="メモを編集" title="メモを編集" disabled={editing !== null} onClick={()=>editor.begin(note)}><Icon name="edit"/></button></div>}</div>{editing === note.id && !smallScreen ? <MemoEditForm editor={editor} registered={registered} preserveTime/> : <>{note.title && <h3 className="memo-title">{note.title}</h3>}<div className="note-body">{render(note.text,note.id)}</div><div className="note-footer">{smallScreen ? <button type="button" className="memo-select-trigger" aria-label="このメモの操作を開く" disabled={editing !== null} onClick={()=>selectMemo(note.id)}><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time></button> : <time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time>}</div></>}</article>)}</div></main>;
}
