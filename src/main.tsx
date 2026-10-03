import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { emptyData, updateNoteText, keywordCounts, keywords, connect, changeKeywordCategory, moveRelative, completeOrder, validateData, type Data } from './model';
import { load, save } from './storage';
import { KeywordEditor } from './KeywordEditor';
import { CategorySettings } from './CategorySettings';
import { useDragOrder } from './useDragOrder';
import { KeywordConnections, ConnectionPicker } from './KeywordConnections';
import { GroupSettings } from './GroupSettings';
import { KeywordCategory } from './KeywordCategory';
import { RelationshipBoard } from './RelationshipBoard';
import { KeywordText } from './KeywordText';
import { BatchClassification } from './BatchClassification';
import { KeywordRename } from './KeywordRename';
import { NumberRegistration } from './NumberRegistration';
import { Timeline, TimelineSetting } from './Timeline';
import './style.css';

function App() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<'notes' | 'keywords' | 'board' | 'timeline'>('notes');
  const [showBoardMemos, setShowBoardMemos] = useState(false);
  const [memoHighlight, setMemoHighlight] = useState<string | null>(null);
  const [showKeywordList, setShowKeywordList] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const renameDialog = useRef<HTMLDialogElement>(null);
  const [renameUndo, setRenameUndo] = useState<{ before: Data; after: Data; from: string; to: string } | null>(null);
  useEffect(() => { if (renaming) renameDialog.current?.showModal(); }, [renaming]);
  useEffect(() => { if (renameUndo && data !== renameUndo.after) setRenameUndo(null); }, [data, renameUndo]);
  const [numbers, setNumbers] = useState(false);
  const numbersDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (numbers) numbersDialog.current?.showModal(); }, [numbers]);
  const [batch, setBatch] = useState(false);
  const batchDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (batch) batchDialog.current?.showModal(); }, [batch]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('読み込み中…');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(false);
  const [groupCategory, setGroupCategory] = useState<string | null>(null);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const groupDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (groupCategory) groupDialog.current?.showModal(); }, [groupCategory]);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (settings) settingsDialog.current?.showModal(); }, [settings]);
  const notesPanel = useRef<HTMLDivElement>(null);
  const keywordPanel = useRef<HTMLElement>(null);
  const scrollPositions = useRef({ notes: 0, keywords: 0, board: 0, timeline: 0, sidebar: 0 });
  useLayoutEffect(() => {
    if (notesPanel.current) notesPanel.current.scrollTop = scrollPositions.current[view];
    if (keywordPanel.current) keywordPanel.current.scrollTop = scrollPositions.current.sidebar;
  }, [view, ready, showKeywordList]);

  useEffect(() => { load().then(value => { setData(value); setReady(true); }).catch(() => { setLoadFailed(true); setStatus('保存データを読み込めません。再読み込みしてください。'); }); }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus('保存中…');
    let active = true;
    const timer = setTimeout(() => { save(data).then(() => { if (active) setStatus('このブラウザに保存済み'); }).catch(() => { if (active) setStatus('保存できません。バックアップを保存してください。'); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [data, ready]);
  const counts = useMemo(() => keywordCounts(data), [data.notes, data.registeredWords]);
  const hasUnclassified = [...counts.keys()].some(word => (data.categories[word] ?? '未分類') === '未分類');
  const keywordIds = completeOrder(data.keywordOrder, [...counts.keys()]);
  const noteIds = completeOrder(data.noteOrder, data.notes.map(note => note.id));
  const organizedNotes = noteIds.map(id => data.notes.find(note => note.id === id)!);
  const notes = (view === 'notes' ? data.notes : organizedNotes).filter(note => (!selected || keywords(note.text).includes(selected)) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const dragOrder = useDragOrder((_group, from, to, after) => setData(previous => ({ ...previous, noteOrder: moveRelative(completeOrder(previous.noteOrder, previous.notes.map(note => note.id)), from, to, after) })));

  function add(event: FormEvent) {
    event.preventDefault();
    if (!data.draft.trim()) return;
    setData(previous => ({ ...previous, draft: '', notes: [...previous.notes, { id: crypto.randomUUID(), text: previous.draft, createdAt: new Date().toISOString() }] }));

  }
  function backup() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `case-note-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function restore(upload: File) {
    try {
      const imported = validateData(JSON.parse(await upload.text()));
      if (!window.confirm('現在のメモと分類を、バックアップの内容に置き換えます。よろしいですか？')) return;
      setData(imported); setView('notes'); setSelected(null); setEditing(null); setLinkSource(null); setGroupCategory(null); setMessage('バックアップを読み込みました。');
    } catch { setMessage('読み込めませんでした。Case NoteのJSONバックアップを選んでください。'); }
  }
  function selectKeyword(word: string) {
    if (linkSource) {
      if (word === linkSource) return;
      setData(previous => { const linked = connect(previous, linkSource, word, crypto.randomUUID()); return linked; });
      setLinkSource(null);
      return;
    }
    setSelected(previous => previous === word ? null : word); if (view !== 'board') setView('keywords');
  }
  const activeKeyword = view === 'notes' ? memoHighlight : linkSource ?? selected;
  const relatedWords = new Set(data.links.filter(link => link.a === activeKeyword || link.b === activeKeyword).map(link => link.a === activeKeyword ? link.b : link.a));
  function rendered(text: string) {
    return <KeywordText text={text} active={activeKeyword} related={relatedWords} onSelect={word => { if (view === 'notes') setMemoHighlight(memoHighlight === word ? null : word); else selectKeyword(word); }}/>;
  }
  return <div className={'app ' + (view === 'keywords' ? 'keyword-view' : view === 'board' ? 'board-view' : 'memo-view') + (showKeywordList ? '' : ' list-hidden')}>
    <header><div><h1>Case Note</h1><p>手がかりを、そのまま書き留める。</p></div><span className="save-status" role="status">{status}</span></header>
    <nav aria-label="表示切り替え"><button aria-pressed={view === 'notes'} onClick={() => { setView('notes'); setSelected(null); setLinkSource(null); }}>メモ</button><button aria-pressed={view === 'keywords'} onClick={() => setView('keywords')}>キーワード <span>{counts.size}</span></button><button aria-pressed={view === 'board'} onClick={() => { setView('board'); setLinkSource(null); }}>関係図</button><button aria-pressed={view === 'timeline'} onClick={() => { setView('timeline'); setSelected(null); setLinkSource(null); }}>タイムライン</button></nav>
    {!ready ? <p>{loadFailed ? 'データを保護するため入力を停止しています。' : 'メモを読み込んでいます。'}</p> : <>
    {renaming && selected && <dialog ref={renameDialog} className="settings-dialog" aria-label="キーワードの名前を変更" onCancel={() => setRenaming(false)}><KeywordRename word={selected} data={data} close={() => setRenaming(false)} apply={(next, name) => { setRenameUndo({ before: data, after: next, from: selected, to: name }); setData(next); if (memoHighlight === selected) setMemoHighlight(name); if (linkSource === selected) setLinkSource(name); setSelected(name); }}/></dialog>}
    {settings && <dialog ref={settingsDialog} className="settings-dialog" aria-label="分類設定" onCancel={() => setSettings(false)}><CategorySettings data={data} update={setData} close={() => setSettings(false)}/></dialog>}
    {groupCategory && <dialog ref={groupDialog} className="settings-dialog" aria-label="まとまり設定" onCancel={() => setGroupCategory(null)}><GroupSettings category={groupCategory} data={data} update={setData} close={() => setGroupCategory(null)}/></dialog>}
    {numbers && <dialog ref={numbersDialog} className="settings-dialog" aria-label="番号をまとめて追加" onCancel={() => setNumbers(false)}><NumberRegistration data={data} update={setData} close={() => setNumbers(false)}/></dialog>}
    {batch && <dialog ref={batchDialog} className="settings-dialog" aria-label="未分類の一括分類" onCancel={() => setBatch(false)}><BatchClassification data={data} words={keywordIds} update={setData} close={() => setBatch(false)}/></dialog>}
    {view === 'timeline' ? <Timeline data={data} update={setData} render={rendered}/> : <main className={view !== 'notes' ? 'workspace organizing' + (showKeywordList ? '' : ' sidebar-collapsed') : 'workspace'}>
      {view !== 'notes' && showKeywordList && <aside ref={keywordPanel} tabIndex={0} aria-label="キーワード一覧" onScroll={event => { scrollPositions.current.sidebar = event.currentTarget.scrollTop; }}><div className="list-heading"><h2>キーワード</h2><button onClick={() => setSettings(!settings)}>分類設定</button></div>{data.categoryOrder.includes('ナンバー') && <button className="batch-start" onClick={() => setNumbers(true)}>番号をまとめて追加</button>}{hasUnclassified && <button className="batch-start" onClick={() => setBatch(true)}>未分類をまとめて分類</button>}<button className="all" aria-pressed={!selected} onClick={() => setSelected(null)}>すべてのメモ <span>{data.notes.length}</span></button>{data.categoryOrder.map(category => <KeywordCategory key={category} category={category} data={data} counts={counts} selected={selected} select={selectKeyword} update={setData} settings={() => setGroupCategory(category)}/>)}{counts.size === 0 && <p className="muted">メモに *キーワード を書くと、ここに集まります。</p>}</aside>}
      <div className="organize-content">
        {view !== 'notes' && <div className="context-header" aria-label="選択キーワードと結び">        {selected && <div className="selection"><div><span className="keyword-kind">キーワード</span><h2>*{selected}</h2><span>{counts.get(selected) ?? 0}件のメモ</span></div><label>分類<select value={data.categories[selected] ?? '未分類'} onChange={event => setData(changeKeywordCategory(data, selected, event.target.value))}>{data.categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label><button onClick={() => setRenaming(true)} disabled={editing !== null || !!linkSource} title={editing !== null ? 'メモの編集を完了してから変更してください' : undefined}>名前を変更</button></div>}
        {linkSource && <ConnectionPicker source={linkSource} words={keywordIds} data={data} update={setData} close={() => setLinkSource(null)}/>}
        {selected && <KeywordConnections word={selected} data={data} update={setData} select={selectKeyword} begin={() => setLinkSource(selected)} isChoosing={!!linkSource}/>}
<div className="organize-switch"><button aria-expanded={showKeywordList} onClick={() => setShowKeywordList(!showKeywordList)}>{showKeywordList ? 'キーワード一覧を隠す' : 'キーワード一覧を表示'}</button>{view === 'board' && <button aria-pressed={showBoardMemos} onClick={() => setShowBoardMemos(!showBoardMemos)}>{showBoardMemos ? '関連メモを隠す' : '関連メモを表示'}</button>}</div></div>}
        {renameUndo && data === renameUndo.after && <div className="rename-notice" role="status">*{renameUndo.from} を *{renameUndo.to} に変更しました。<button disabled={editing !== null || !!linkSource} onClick={() => { setData(renameUndo.before); setSelected(renameUndo.from); if (memoHighlight === renameUndo.to) setMemoHighlight(renameUndo.from); if (linkSource === renameUndo.to) setLinkSource(renameUndo.from); setRenameUndo(null); }}>元に戻す</button></div>}
        {view === 'notes' && memoHighlight && <div className="memo-highlight-bar">*{memoHighlight} を強調中 <button onClick={() => setMemoHighlight(null)}>強調を解除</button></div>}
        <div className={'organize-body ' + (view === 'board' ? 'with-board' : '')}>
        {view === 'board' && <RelationshipBoard embedded focusWord={selected} onSelect={selectKeyword} data={data} update={setData} words={keywordIds} openNotes={word => { setSelected(word); setShowBoardMemos(true); }}/>}
      <div hidden={view === 'board' && !showBoardMemos} className="notes-panel" ref={notesPanel} tabIndex={0} role="region" aria-label={view === 'notes' ? 'メモ一覧' : '関連メモ一覧'} onScroll={event => { scrollPositions.current[view] = event.currentTarget.scrollTop; }}>
        {view === 'notes' && <form className="composer" onSubmit={add}><label htmlFor="draft">新しいメモ</label><KeywordEditor id="draft" placeholder="文章を書いて選択すると、キーワードにできます" value={data.draft} registered={new Set(counts.keys())} onChange={value => setData({ ...data, draft: value })} onSubmitShortcut={() => add({ preventDefault() {} } as FormEvent)}/><div className="composer-bottom"><small>*から空白までがキーワード</small><button className="primary" disabled={!data.draft.trim()}>追加</button></div></form>}
        <div className="list-heading"><h2>{selected ? '関連するメモ' : 'メモ'} <span>{notes.length}</span></h2><input aria-label="メモを検索" type="search" placeholder="メモを検索" value={search} onChange={event => setSearch(event.target.value)}/></div>
        {notes.length === 0 && <div className="empty"><p>{data.notes.length ? '該当するメモはありません。' : 'まだメモはありません。'}</p>{!data.notes.length && <p>番号も名前も時間も、まずは別々のキーワードで。<br/>分類や並べ替えは、あとから考えましょう。</p>}</div>}
        <p className="order-hint">{view === 'notes' ? '登録順' : '整理順 · ハンドルをドラッグして並べ替え'}</p>
        <div className="note-list">{notes.map((note, index) => <article key={note.id} {...(view !== 'notes' && editing !== note.id ? dragOrder.row('notes', note.id) : {})}>{view !== 'notes' && editing !== note.id && <div className="note-sort"><button className="drag-handle" aria-label="メモをドラッグして並べ替え" {...dragOrder.handle('notes', note.id)}>⠿</button><div><button aria-label="メモを上へ" disabled={index === 0} onClick={() => setData({ ...data, noteOrder: moveRelative(noteIds, note.id, notes[index - 1].id, false) })}>↑</button><button aria-label="メモを下へ" disabled={index === notes.length - 1} onClick={() => setData({ ...data, noteOrder: moveRelative(noteIds, note.id, notes[index + 1].id, true) })}>↓</button></div></div>}{editing === note.id ? <form onSubmit={event => { event.preventDefault(); if (!editText.trim()) return; setData(updateNoteText(data, note.id, editText)); setEditing(null); }}><KeywordEditor label="メモを編集" autoFocus value={editText} onChange={setEditText} registered={new Set(counts.keys())}/><div className="actions"><button type="button" onClick={() => setEditing(null)}>キャンセル</button><button className="primary" disabled={!editText.trim()}>保存</button></div></form> : <><div className="note-body">{rendered(note.text)}</div><TimelineSetting note={note} data={data} update={setData}/><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><div><button onClick={() => { setEditing(note.id); setEditText(note.text); }}>編集</button><button onClick={() => { if (window.confirm('このメモを削除しますか？')) setData({ ...data, notes: data.notes.filter(item => item.id !== note.id), timeline: Object.fromEntries(Object.entries(data.timeline ?? {}).filter(([id]) => id !== note.id)) }); }}>削除</button></div></div></>}</article>)}</div>
      </div>
      </div>
      </div>
    </main>}
    <footer><p>メモはこのブラウザに保存されます。端末間の自動同期はありません。</p><div><button onClick={backup}>バックアップを保存</button><button onClick={() => file.current?.click()}>読み込む</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={event => { const upload = event.target.files?.[0]; if (upload) void restore(upload); event.target.value = ''; }}/></div><p role="status">{message}</p></footer>
    </>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
