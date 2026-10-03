import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { emptyData, keywords, connect, changeKeywordCategory, moveRelative, completeOrder, validateData, type Data } from './model';
import { load, save } from './storage';
import { KeywordEditor } from './KeywordEditor';
import { CategorySettings } from './CategorySettings';
import { useDragOrder } from './useDragOrder';
import { KeywordConnections, ConnectionPicker } from './KeywordConnections';
import { GroupSettings } from './GroupSettings';
import { KeywordCategory } from './KeywordCategory';
import { RelationshipBoard } from './RelationshipBoard';
import './style.css';

function App() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<'notes' | 'keywords' | 'board'>('notes');
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
  const scrollPositions = useRef({ notes: 0, keywords: 0, board: 0, sidebar: 0 });
  useLayoutEffect(() => {
    if (notesPanel.current) notesPanel.current.scrollTop = scrollPositions.current[view];
    if (keywordPanel.current) keywordPanel.current.scrollTop = scrollPositions.current.sidebar;
  }, [view, ready]);

  useEffect(() => { load().then(value => { setData(value); setReady(true); }).catch(() => { setLoadFailed(true); setStatus('保存データを読み込めません。再読み込みしてください。'); }); }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus('保存中…');
    let active = true;
    const timer = setTimeout(() => { save(data).then(() => { if (active) setStatus('このブラウザに保存済み'); }).catch(() => { if (active) setStatus('保存できません。バックアップを保存してください。'); }); }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [data, ready]);
  const counts = useMemo(() => {
    const result = new Map<string, number>();
    data.notes.forEach(note => keywords(note.text).forEach(word => result.set(word, (result.get(word) ?? 0) + 1)));
    return result;
  }, [data.notes]);
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
      setData(previous => connect(previous, linkSource, word, crypto.randomUUID()));
      setLinkSource(null);
      return;
    }
    setSelected(word); setView('keywords');
  }
  function rendered(text: string) {
    return text.split(/((?:^|\s)\*[^\s*]+)/gu).map((part, index) => {
      const match = part.match(/^(\s*)\*([^\s*]+)$/u);
      return match ? <span key={index}>{match[1]}<button className="chip" title={'*' + match[2]} onClick={() => selectKeyword(match[2])}>{'*' + match[2]}</button></span> : part;
    });
  }
  return <div className={'app ' + (view === 'keywords' ? 'keyword-view' : view === 'board' ? 'board-view' : 'memo-view')}>
    <header><div><h1>Case Note</h1><p>手がかりを、そのまま書き留める。</p></div><span className="save-status" role="status">{status}</span></header>
    <nav aria-label="表示切り替え"><button aria-pressed={view === 'notes'} onClick={() => { setView('notes'); setSelected(null); setLinkSource(null); }}>メモ</button><button aria-pressed={view === 'keywords'} onClick={() => setView('keywords')}>キーワード <span>{counts.size}</span></button><button aria-pressed={view === 'board'} onClick={() => { setView('board'); setLinkSource(null); }}>関係図</button></nav>
    {!ready ? <p>{loadFailed ? 'データを保護するため入力を停止しています。' : 'メモを読み込んでいます。'}</p> : <>
    {settings && <dialog ref={settingsDialog} className="settings-dialog" aria-label="分類設定" onCancel={() => setSettings(false)}><CategorySettings data={data} update={setData} close={() => setSettings(false)}/></dialog>}
    {groupCategory && <dialog ref={groupDialog} className="settings-dialog" aria-label="まとまり設定" onCancel={() => setGroupCategory(null)}><GroupSettings category={groupCategory} data={data} update={setData} close={() => setGroupCategory(null)}/></dialog>}
    {view === 'board' ? <RelationshipBoard data={data} update={setData} words={keywordIds} openNotes={word => { setSelected(word); setView('keywords'); }}/>: <main className={view === 'keywords' ? 'workspace organizing' : 'workspace'}>
      {view === 'keywords' && <aside ref={keywordPanel} tabIndex={0} aria-label="キーワード一覧" onScroll={event => { scrollPositions.current.sidebar = event.currentTarget.scrollTop; }}><div className="list-heading"><h2>キーワード</h2><button onClick={() => setSettings(!settings)}>分類設定</button></div><button className="all" aria-pressed={!selected} onClick={() => setSelected(null)}>すべてのメモ <span>{data.notes.length}</span></button>{data.categoryOrder.map(category => <KeywordCategory key={category} category={category} data={data} counts={counts} selected={selected} select={selectKeyword} update={setData} settings={() => setGroupCategory(category)}/>)}{counts.size === 0 && <p className="muted">メモに *キーワード を書くと、ここに集まります。</p>}</aside>}
      <div className="notes-panel" ref={notesPanel} tabIndex={0} role="region" aria-label={view === 'notes' ? 'メモ一覧' : '関連メモ一覧'} onScroll={event => { scrollPositions.current[view] = event.currentTarget.scrollTop; }}>
        {view === 'notes' && <form className="composer" onSubmit={add}><label htmlFor="draft">新しいメモ</label><KeywordEditor id="draft" placeholder="文章を書いて選択すると、キーワードにできます" value={data.draft} registered={new Set(counts.keys())} onChange={value => setData({ ...data, draft: value })} onSubmitShortcut={() => add({ preventDefault() {} } as FormEvent)}/><div className="composer-bottom"><small>*から空白までがキーワード</small><button className="primary" disabled={!data.draft.trim()}>追加</button></div></form>}
        {selected && <div className="selection"><div><h2>*{selected}</h2><span>{counts.get(selected) ?? 0}件のメモ</span></div><label>分類<select value={data.categories[selected] ?? '未分類'} onChange={event => setData(changeKeywordCategory(data, selected, event.target.value))}>{data.categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label><button onClick={() => setSelected(null)} aria-label="キーワードの絞り込みを解除">解除</button></div>}
        {linkSource && <ConnectionPicker source={linkSource} words={keywordIds} data={data} update={setData} close={() => setLinkSource(null)}/>}
        {selected && <KeywordConnections word={selected} data={data} update={setData} select={selectKeyword} begin={() => setLinkSource(selected)} isChoosing={!!linkSource}/>}
        <div className="list-heading"><h2>{selected ? '関連するメモ' : 'メモ'} <span>{notes.length}</span></h2><input aria-label="メモを検索" type="search" placeholder="メモを検索" value={search} onChange={event => setSearch(event.target.value)}/></div>
        {notes.length === 0 && <div className="empty"><p>{data.notes.length ? '該当するメモはありません。' : 'まだメモはありません。'}</p>{!data.notes.length && <p>番号も名前も時間も、まずは別々のキーワードで。<br/>分類や並べ替えは、あとから考えましょう。</p>}</div>}
        <p className="order-hint">{view === 'notes' ? '登録順' : '整理順 · ハンドルをドラッグして並べ替え'}</p>
        <div className="note-list">{notes.map((note, index) => <article key={note.id} {...(view === 'keywords' && editing !== note.id ? dragOrder.row('notes', note.id) : {})}>{view === 'keywords' && editing !== note.id && <div className="note-sort"><button className="drag-handle" aria-label="メモをドラッグして並べ替え" {...dragOrder.handle('notes', note.id)}>⠿</button><div><button aria-label="メモを上へ" disabled={index === 0} onClick={() => setData({ ...data, noteOrder: moveRelative(noteIds, note.id, notes[index - 1].id, false) })}>↑</button><button aria-label="メモを下へ" disabled={index === notes.length - 1} onClick={() => setData({ ...data, noteOrder: moveRelative(noteIds, note.id, notes[index + 1].id, true) })}>↓</button></div></div>}{editing === note.id ? <form onSubmit={event => { event.preventDefault(); if (!editText.trim()) return; setData({ ...data, notes: data.notes.map(item => item.id === note.id ? { ...item, text: editText } : item) }); setEditing(null); }}><KeywordEditor label="メモを編集" autoFocus value={editText} onChange={setEditText} registered={new Set(counts.keys())}/><div className="actions"><button type="button" onClick={() => setEditing(null)}>キャンセル</button><button className="primary" disabled={!editText.trim()}>保存</button></div></form> : <><div className="note-body">{rendered(note.text)}</div><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><div><button onClick={() => { setEditing(note.id); setEditText(note.text); }}>編集</button><button onClick={() => { if (window.confirm('このメモを削除しますか？')) setData({ ...data, notes: data.notes.filter(item => item.id !== note.id) }); }}>削除</button></div></div></>}</article>)}</div>
      </div>
    </main>}
    <footer><p>メモはこのブラウザに保存されます。端末間の自動同期はありません。</p><div><button onClick={backup}>バックアップを保存</button><button onClick={() => file.current?.click()}>読み込む</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={event => { const upload = event.target.files?.[0]; if (upload) void restore(upload); event.target.value = ''; }}/></div><p role="status">{message}</p></footer>
    </>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
