import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { emptyData, keywords, moveBefore, validateData, type Data } from './model';
import { load, save } from './storage';
import './style.css';
import { KeywordEditor } from './KeywordEditor';
import { CategorySettings } from './CategorySettings';

function App() {
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<'notes' | 'keywords'>('notes');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('読み込み中…');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const [settings, setSettings] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
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
  const notes = data.notes.filter(note => (!selected || keywords(note.text).includes(selected)) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
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
      setData(imported); setSelected(null); setEditing(null); setMessage('バックアップを読み込みました。');
    } catch { setMessage('読み込めませんでした。Case NoteのJSONバックアップを選んでください。'); }
  }
  function rendered(text: string) {
    return text.split(/((?:^|\s)\*[^\s*]+)/gu).map((part, index) => {
      const match = part.match(/^(\s*)\*([^\s*]+)$/u);
      return match ? <span key={index}>{match[1]}<button className="chip" onClick={() => { setSelected(match[2]); setView('keywords'); }}>{'*' + match[2]}</button></span> : part;
    });
  }
  return <div className="app">
    <header><div><h1>Case Note</h1><p>手がかりを、そのまま書き留める。</p></div><span className="save-status" role="status">{status}</span></header>
    <nav aria-label="表示切り替え"><button aria-pressed={view === 'notes'} onClick={() => { setView('notes'); setSelected(null); }}>メモ</button><button aria-pressed={view === 'keywords'} onClick={() => setView('keywords')}>キーワード <span>{counts.size}</span></button></nav>
    {!ready ? <p>{loadFailed ? 'データを保護するため入力を停止しています。' : 'メモを読み込んでいます。'}</p> : <>
    {settings && <CategorySettings data={data} update={setData} close={() => setSettings(false)}/>}
    <main className={view === 'keywords' ? 'workspace organizing' : 'workspace'}>
      {view === 'keywords' && <aside aria-label="キーワード一覧"><div className="list-heading"><h2>キーワード</h2><button onClick={() => setSettings(!settings)}>分類設定</button></div><button className="all" aria-pressed={!selected} onClick={() => setSelected(null)}>すべてのメモ <span>{data.notes.length}</span></button>{data.categoryOrder.map(category => {
        const ordered = [...data.keywordOrder.filter(word => counts.has(word)), ...[...counts.keys()].filter(word => !data.keywordOrder.includes(word))];
        const words = ordered.filter(word => (data.categories[word] ?? '未分類') === category);
        return words.length > 0 && <section key={category}><button className="category-toggle" aria-expanded={!data.collapsed.includes(category)} onClick={() => setData({ ...data, collapsed: data.collapsed.includes(category) ? data.collapsed.filter(item => item !== category) : [...data.collapsed, category] })}><span>{data.collapsed.includes(category) ? '▸' : '▾'} {category}</span><span>{words.length}</span></button>{!data.collapsed.includes(category) && words.map((word, index) => <div className="word-row" key={word} draggable onDragStart={event => { setDragged(word); event.dataTransfer.setData('text/plain', word); }} onDragEnd={() => setDragged(null)} onDragOver={event => { if (dragged && (data.categories[dragged] ?? '未分類') === category) event.preventDefault(); }} onDrop={event => { event.preventDefault(); if (dragged && (data.categories[dragged] ?? '未分類') === category) setData({ ...data, keywordOrder: moveBefore(ordered, dragged, word) }); setDragged(null); }}><button className="word" aria-pressed={selected === word} onClick={() => setSelected(word)}><span>*{word}</span><span>{counts.get(word)}件</span></button><div className="word-moves"><button aria-label={`*${word}を上へ`} disabled={index === 0} onClick={() => setData({ ...data, keywordOrder: moveBefore(ordered, word, words[index - 1]) })}>↑</button><button aria-label={`*${word}を下へ`} disabled={index === words.length - 1} onClick={() => setData({ ...data, keywordOrder: moveBefore(ordered, words[index + 1], word) })}>↓</button></div></div>)}</section>;
      })}{counts.size === 0 && <p className="muted">メモに *キーワード を書くと、ここに集まります。</p>}</aside>}
      <div className="notes-panel">
        {view === 'notes' && <form className="composer" onSubmit={add}><label htmlFor="draft">新しいメモ</label><KeywordEditor id="draft" placeholder="文章を書いて選択すると、キーワードにできます" value={data.draft} registered={new Set(counts.keys())} onChange={value => setData({ ...data, draft: value })} onSubmitShortcut={() => add({ preventDefault() {} } as FormEvent)}/><div className="composer-bottom"><small>*から空白までがキーワード</small><button className="primary" disabled={!data.draft.trim()}>追加</button></div></form>}
        {selected && <div className="selection"><div><h2>*{selected}</h2><span>{counts.get(selected) ?? 0}件のメモ</span></div><label>分類<select value={data.categories[selected] ?? '未分類'} onChange={event => setData({ ...data, categories: { ...data.categories, [selected]: event.target.value } })}>{data.categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label><button onClick={() => setSelected(null)} aria-label="キーワードの絞り込みを解除">解除</button></div>}
        <div className="list-heading"><h2>{selected ? '関連するメモ' : 'メモ'} <span>{notes.length}</span></h2><input aria-label="メモを検索" type="search" placeholder="メモを検索" value={search} onChange={event => setSearch(event.target.value)}/></div>
        {notes.length === 0 && <div className="empty"><p>{data.notes.length ? '該当するメモはありません。' : 'まだメモはありません。'}</p>{!data.notes.length && <p>番号も名前も時間も、まずは別々のキーワードで。<br/>分類や並べ替えは、あとから考えましょう。</p>}</div>}
        <div className="note-list">{notes.map(note => <article key={note.id}>{editing === note.id ? <form onSubmit={event => { event.preventDefault(); if (!editText.trim()) return; setData({ ...data, notes: data.notes.map(item => item.id === note.id ? { ...item, text: editText } : item) }); setEditing(null); }}><KeywordEditor label="メモを編集" autoFocus value={editText} onChange={setEditText} registered={new Set(counts.keys())}/><div className="actions"><button type="button" onClick={() => setEditing(null)}>キャンセル</button><button className="primary" disabled={!editText.trim()}>保存</button></div></form> : <><div className="note-body">{rendered(note.text)}</div><div className="note-footer"><time dateTime={note.createdAt}>{new Date(note.createdAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><div><button onClick={() => { setEditing(note.id); setEditText(note.text); }}>編集</button><button onClick={() => { if (window.confirm('このメモを削除しますか？')) setData({ ...data, notes: data.notes.filter(item => item.id !== note.id) }); }}>削除</button></div></div></>}</article>)}</div>
      </div>
    </main>
    <footer><p>メモはこのブラウザに保存されます。端末間の自動同期はありません。</p><div><button onClick={backup}>バックアップを保存</button><button onClick={() => file.current?.click()}>読み込む</button><input ref={file} hidden type="file" accept=".json,application/json" onChange={event => { const upload = event.target.files?.[0]; if (upload) void restore(upload); event.target.value = ''; }}/></div><p role="status">{message}</p></footer>
    </>}
  </div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
