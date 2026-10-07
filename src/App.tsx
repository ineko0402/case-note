import { SearchField } from './SearchField';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { emptyData, personWords, keywordCounts, keywords, connect, moveRelative, completeOrder, validateData, type Data } from './model';
import { load, save } from './storage';
import { KeywordEditor } from './KeywordEditor';
import { CategorySettings } from './CategorySettings';
import { useDragOrder } from './useDragOrder';
import { KeywordContext } from './KeywordContext';
import { KeywordSidebar } from './KeywordSidebar';
import { ConnectionsOverview } from './ConnectionsOverview';
import { KeywordText } from './KeywordText';
import { BatchClassification } from './BatchClassification';
import { KeywordRename } from './KeywordRename';
import { NumberRegistration } from './NumberRegistration';
import { Timeline } from './Timeline';
import { KeywordMerge } from './KeywordMerge';
import { DataManagement } from './DataManagement';
import { MemoList } from './MemoList';
import { AppNavigation } from './AppNavigation';

import { QuickMemo } from './QuickMemo';

import { KeywordDragProvider } from './KeywordDrag';
import { useSmallScreen } from './useSmallScreen';
import { connectionCandidates, filterConnectionCandidates, initialConnectionOptions, type ConnectionOptions } from './connectionCandidates';
import { ConnectionMemoToolbar, ConnectionPickerDialog } from './ConnectionPicker';
export function App() {
  const smallScreen = useSmallScreen();
  const [quickMemo, setQuickMemo] = useState(false);
  const [data, setData] = useState<Data>(emptyData);
  const [ready, setReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [view, setView] = useState<'notes' | 'keywords' | 'board' | 'timeline'>('notes');

  const [memoOrder,setMemoOrder]=useState<'asc'|'desc'>('asc');
  const [connectionMode,setConnectionMode]=useState<'board'|'timeline'>('board');
  const [showBoardMemos, setShowBoardMemos] = useState(false);
  const [memoHighlight, setMemoHighlight] = useState<string | null>(null);
  const [showKeywordList, setShowKeywordList] = useState(true);
  const [merging,setMerging]=useState(false);
  const mergeDialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(merging)mergeDialog.current?.showModal();},[merging]);
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
  const [management,setManagement]=useState(false);
  const [replacing,setReplacing]=useState(false);
  const managementDialog=useRef<HTMLDialogElement>(null);
  const saveTimer=useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(()=>{if(management)managementDialog.current?.showModal();},[management]);
  const [settings, setSettings] = useState(false);
  const [linkSource, setLinkSource] = useState<string | null>(null);
  const [connectionOptions, setConnectionOptions] = useState<ConnectionOptions>(() => initialConnectionOptions('list'));
  const [lastConnection, setLastConnection] = useState<string | null>(null);
  const memoConnecting = !!linkSource && connectionOptions.mode === 'memo';
  useEffect(() => {
    document.documentElement.classList.toggle('mobile-memo-page', smallScreen && !memoConnecting);
    return () => document.documentElement.classList.remove('mobile-memo-page');
  }, [smallScreen, memoConnecting]);
  const allConnectionCandidates = useMemo(() => linkSource ? connectionCandidates(data, linkSource) : [], [data, linkSource]);
  const visibleConnectionCandidates = filterConnectionCandidates(allConnectionCandidates, connectionOptions).filter(item => !memoConnecting || item.sharedNotes > 0);
  const memoConnectionTargets = new Map(visibleConnectionCandidates.map(item => [item.word, item]));
  const connectionCategories = [...new Set([...data.categoryOrder, ...allConnectionCandidates.map(item => item.category)])];
  function beginConnecting(mode: ConnectionOptions['mode']) {
    if (!selected || editing !== null) return;
    setConnectionOptions(initialConnectionOptions(mode)); setLastConnection(null); setLinkSource(selected);
  }
  function submitConnection() {
    const target = visibleConnectionCandidates.find(item => item.word === connectionOptions.target);
    if (!linkSource || !target || target.status) return;
    const id = crypto.randomUUID();
    setData(previous => connect(previous, linkSource, target.word, id)); setLastConnection(id);
    if (connectionOptions.continueConnecting) setConnectionOptions({...connectionOptions, target: null, feedback: '*'+linkSource+' と *'+target.word+' を仮につなげました。'});
    else {setLinkSource(null); setMessage('*'+linkSource+' と *'+target.word+' を仮につなげました。');}
  }
  function undoConnection() {
    if (!lastConnection) return;
    setData(previous => ({...previous, links: previous.links.filter(link => link.id !== lastConnection)}));
    setLastConnection(null); setConnectionOptions(previous => ({...previous, target: null, feedback: '直前に作ったつながりを取り消しました。'}));
  }
  const connectionProps = {source: linkSource ?? '', categories: connectionCategories, candidates: visibleConnectionCandidates, options: connectionOptions, change: setConnectionOptions, submit: submitConnection, close: () => setLinkSource(null), undo: lastConnection && data.links.some(link => link.id === lastConnection) ? undoConnection : undefined};
  useEffect(() => {
    if (!memoConnecting) return;
    function escape(event: KeyboardEvent) {if (event.key === 'Escape' && !document.querySelector('dialog[open]')) setLinkSource(null);}
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [memoConnecting]);
  useEffect(() => {
    if (!memoConnecting) return;
    const viewport = window.visualViewport;
    const root = document.documentElement;
    const previous = root.style.getPropertyValue('--connect-memo-vh');
    function resize() {root.style.setProperty('--connect-memo-vh', (viewport?.height ?? window.innerHeight) + 'px');}
    resize(); viewport?.addEventListener('resize', resize); window.addEventListener('resize', resize);
    return () => {
      viewport?.removeEventListener('resize', resize); window.removeEventListener('resize', resize);
      if (previous) root.style.setProperty('--connect-memo-vh', previous); else root.style.removeProperty('--connect-memo-vh');
    };
  }, [memoConnecting]);
  const settingsDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (settings) settingsDialog.current?.showModal(); }, [settings]);
  const notesPanel = useRef<HTMLDivElement>(null);
  const keywordPanel = useRef<HTMLElement>(null);
  const scrollPositions = useRef({ notes: 0, keywords: 0, board: 0, timeline: 0, sidebar: 0 });
  useLayoutEffect(() => {
    if (notesPanel.current) notesPanel.current.scrollTop = scrollPositions.current[view];
    if (keywordPanel.current) keywordPanel.current.scrollTop = scrollPositions.current.sidebar;
  }, [view, ready, showKeywordList, memoConnecting]);

  useEffect(() => { load().then(value => { setData(value); setReady(true); }).catch(() => { setLoadFailed(true); setStatus('保存データを読み込めません。再読み込みしてください。'); }); }, []);
  useEffect(() => {
    if (!ready) return;
    setStatus('保存中…');
    let active = true;
    const timer = setTimeout(() => { save(data).then(() => { if (active) setStatus('このブラウザに保存済み'); }).catch(() => { if (active) setStatus('保存できません。バックアップを保存してください。'); }); }, 250);
    saveTimer.current = timer;
    return () => { active = false; clearTimeout(timer); };
  }, [data, ready]);
  const counts = useMemo(() => keywordCounts(data), [data.notes, data.registeredWords]);
  const keywordIds = completeOrder(data.keywordOrder, [...counts.keys()]);
  const noteIds = completeOrder(data.noteOrder, data.notes.map(note => note.id));
  const organizedNotes = noteIds.map(id => data.notes.find(note => note.id === id)!);
  const notes = (view === 'notes' ? memoOrder === 'desc' ? [...data.notes].reverse() : data.notes : organizedNotes).filter(note => (!selected || keywords(note.text).some(word => personWords(data, selected).includes(word))) && note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase())).filter(note => !memoConnecting || (keywords(note.text).includes(linkSource!) && keywords(note.text).some(word => memoConnectionTargets.has(word))));
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
  async function replaceData(next: Data) {
    setReplacing(true);
    if(saveTimer.current)clearTimeout(saveTimer.current);
    try {
      await save(next);
      setData(next);setConnectionMode('board');setQuickMemo(false);setMemoOrder('asc');setView('notes');setSelected(null);setEditing(null);setEditText('');setLinkSource(null);setMemoHighlight(null);setSearch('');setRenameUndo(null);setSettings(false);setBatch(false);setNumbers(false);setRenaming(false);setMerging(false);setShowBoardMemos(false);setShowKeywordList(true);
      scrollPositions.current={notes:0,keywords:0,board:0,timeline:0,sidebar:0};
      if(notesPanel.current)notesPanel.current.scrollTop=0;
      if(keywordPanel.current)keywordPanel.current.scrollTop=0;
      setMessage('データを更新しました。');
    } catch(error) { setData(previous=>({...previous}));throw error; }
    finally {setReplacing(false);}
  }
  function selectKeyword(word: string) {
    if (linkSource) {
      const target = visibleConnectionCandidates.find(item => item.word === word);
      if (target && !target.status) setConnectionOptions(previous => ({...previous, target: previous.target === word ? null : word}));
      return;
    }
    setSelected(previous => previous === word ? null : word); if (view !== 'board') setView('keywords');
  }
  const activeKeyword = view === 'notes' ? memoHighlight : linkSource ?? selected;
  const activeMembers=activeKeyword?personWords(data,activeKeyword):[];
  const relatedWords = new Set([...activeMembers.filter(word=>word!==activeKeyword),...data.links.filter(link=>activeMembers.includes(link.a)||activeMembers.includes(link.b)).flatMap(link=>[link.a,link.b]).filter(word=>word!==activeKeyword)]);
  function rendered(text: string) {
    return <KeywordText text={text} active={activeKeyword} related={relatedWords} connectionTargets={memoConnecting ? new Map(allConnectionCandidates.map(item => [item.word, {...item, eligible: memoConnectionTargets.has(item.word)}])) : undefined} connectionTarget={connectionOptions.target} onSelect={word => { if (view === 'notes') setMemoHighlight(memoHighlight === word ? null : word); else selectKeyword(word); }}/>;
  }
  return <KeywordDragProvider data={data} update={setData}><div className={'app ' + (view === 'keywords' ? 'keyword-view' : view === 'board' || view === 'timeline' ? 'board-view' : 'memo-view') + (showKeywordList && !memoConnecting && view !== 'timeline' ? '' : ' list-hidden') + (memoConnecting ? ' connecting-view' : '')}>
    <header><div><h1>Case Note</h1><p>手がかりを、そのまま書き留める。</p></div></header>
    <AppNavigation view={view} connectionMode={connectionMode} count={counts.size} setView={setView} setSelected={setSelected} setLinkSource={setLinkSource}/>
    {ready && quickMemo && <QuickMemo data={data} update={setData} close={()=>setQuickMemo(false)}/>}
    {!ready ? <p>{loadFailed ? 'データを保護するため入力を停止しています。' : 'メモを読み込んでいます。'}</p> : <>
    {linkSource && connectionOptions.mode === 'list' && <ConnectionPickerDialog {...connectionProps}/>}
    {management && <dialog ref={managementDialog} className="settings-dialog" aria-label="データ管理" onCancel={event=>{if(replacing)event.preventDefault();else setManagement(false);}}><DataManagement data={data} backup={backup} apply={replaceData} busy={replacing} close={()=>setManagement(false)}/></dialog>}
    {merging && selected && <dialog ref={mergeDialog} className="settings-dialog" aria-label="キーワードを統合" onCancel={()=>setMerging(false)}><KeywordMerge word={selected} data={data} close={()=>setMerging(false)} apply={(next,name)=>{setRenameUndo({before:data,after:next,from:selected,to:name});setData(next);if(memoHighlight===selected)setMemoHighlight(name);setSelected(name);}}/></dialog>}
    {renaming && selected && <dialog ref={renameDialog} className="settings-dialog" aria-label="キーワードの名前を変更" onCancel={() => setRenaming(false)}><KeywordRename word={selected} data={data} close={() => setRenaming(false)} apply={(next, name) => { setRenameUndo({ before: data, after: next, from: selected, to: name }); setData(next); if (memoHighlight === selected) setMemoHighlight(name); if (linkSource === selected) setLinkSource(name); setSelected(name);  }}/></dialog>}
    {settings && <dialog ref={settingsDialog} className="settings-dialog" aria-label="分類設定" onCancel={() => setSettings(false)}><CategorySettings data={data} update={setData} close={() => setSettings(false)}/></dialog>}
    {numbers && <dialog ref={numbersDialog} className="settings-dialog" aria-label="番号をまとめて追加" onCancel={() => setNumbers(false)}><NumberRegistration data={data} update={setData} close={() => setNumbers(false)}/></dialog>}
    {batch && <dialog ref={batchDialog} className="settings-dialog" aria-label="未分類の一括分類" onCancel={() => setBatch(false)}><BatchClassification data={data} words={keywordIds} update={setData} close={() => setBatch(false)}/></dialog>}
    {view === 'notes' && <div className="memo-view-controls" aria-label="メモの操作">{smallScreen && <button className="primary" onClick={()=>setQuickMemo(true)}>新しいメモ</button>}<label>登録順<select aria-label="メモの登録順" value={memoOrder} onChange={event=>{setMemoOrder(event.target.value as 'asc'|'desc');scrollPositions.current.notes=0;if(notesPanel.current)notesPanel.current.scrollTop=0;}}><option value="asc">古い順</option><option value="desc">新しい順</option></select></label></div>}
    {(view === 'board' || view === 'timeline') && <div className="connection-view-controls" aria-label="つながりの表示方法"><div className="memo-mode-switch"><button aria-pressed={view === 'board'} onClick={()=>{setConnectionMode('board');setView('board');setLinkSource(null);}}>関係</button><button aria-pressed={view === 'timeline'} onClick={()=>{setConnectionMode('timeline');setView('timeline');setLinkSource(null);}}>時系列</button></div></div>}
    {view === 'timeline' ? <Timeline data={data} update={setData} /> : <main className={view !== 'notes' ? 'workspace organizing' + (showKeywordList && !memoConnecting ? '' : ' sidebar-collapsed') : 'workspace'}>
      {view !== 'notes' && showKeywordList && !memoConnecting && <KeywordSidebar hide={() => setShowKeywordList(false)} data={data} counts={counts} selected={selected} setSelected={setSelected} selectKeyword={selectKeyword} setData={setData} settings={settings} setSettings={setSettings} setBatch={setBatch} setNumbers={setNumbers} keywordPanel={keywordPanel} onScroll={top=>{scrollPositions.current.sidebar=top;}}/>}
      <div className="organize-content">
        {memoConnecting ? <ConnectionMemoToolbar {...connectionProps}/> : view !== 'notes' && <KeywordContext clearSelection={() => setSelected(null)} data={data} selected={selected} editing={editing} linkSource={linkSource} setData={setData} selectKeyword={selectKeyword} setRenaming={setRenaming} setMerging={setMerging} beginConnecting={beginConnecting} showKeywordList={showKeywordList} setShowKeywordList={setShowKeywordList} showBoardMemos={showBoardMemos} setShowBoardMemos={setShowBoardMemos} view={view}/>}
        {renameUndo && data === renameUndo.after && <div className="rename-notice" role="status">*{renameUndo.from} を *{renameUndo.to} に変更しました。<button disabled={editing !== null || !!linkSource} onClick={() => { setData(renameUndo.before);  setSelected(renameUndo.from); if (memoHighlight === renameUndo.to) setMemoHighlight(renameUndo.from); if (linkSource === renameUndo.to) setLinkSource(renameUndo.from); setRenameUndo(null); }}>元に戻す</button></div>}
        {view === 'notes' && memoHighlight && <div className="memo-highlight-bar">*{memoHighlight} を強調中 <button onClick={() => setMemoHighlight(null)}>強調を解除</button></div>}
        <div className={'organize-body ' + (memoConnecting ? 'connecting-memos' : view === 'board' ? 'with-board' : '')}>
        {view === 'board' && !memoConnecting && <ConnectionsOverview data={data} select={selectKeyword} openNotes={word => { setSelected(word); setShowBoardMemos(true); }}/>}
      <div hidden={view === 'board' && !showBoardMemos && !memoConnecting} className="notes-panel" ref={notesPanel} tabIndex={0} role="region" aria-label={view === 'notes' ? 'メモ一覧' : '関連メモ一覧'} onScroll={event => { scrollPositions.current[view] = event.currentTarget.scrollTop; }}>
        {view === 'notes' && !smallScreen && <form className="composer" onSubmit={add}><label htmlFor="draft">新しいメモ</label><KeywordEditor id="draft" placeholder="文章を書いて選択すると、キーワードにできます" value={data.draft} registered={new Set(counts.keys())} onChange={value => setData({ ...data, draft: value })} onSubmitShortcut={() => add({ preventDefault() {} } as FormEvent)}/><div className="composer-bottom"><small>*から空白までがキーワード</small><button className="primary" disabled={!data.draft.trim()}>追加</button></div></form>}
        <div className="list-heading"><h2>{selected ? '関連するメモ' : 'メモ'} <span>{notes.length}</span></h2><SearchField label="メモを検索" placeholder="メモを検索" value={search} onChange={setSearch}/></div>
        {notes.length === 0 && <div className="empty"><p>{data.notes.length ? '該当するメモはありません。' : 'まだメモはありません。'}</p>{!data.notes.length && <p>番号も名前も時間も、まずは別々のキーワードで。<br/>分類や並べ替えは、あとから考えましょう。</p>}</div>}
        <p className="order-hint">{view === 'notes' ? memoOrder==='desc'?'登録順 · 新しい順':'登録順 · 古い順' : '整理順 · ハンドルをドラッグして並べ替え'}</p>
        <MemoList data={data} notes={notes} counts={counts} view={view} editing={editing} editText={editText} setEditText={setEditText} setEditing={setEditing} setData={setData} dragOrder={dragOrder} noteIds={noteIds} rendered={rendered}/>
      </div>
      </div>
      </div>
    </main>}
    <footer><span className="save-status" role="status">{status}</span><p>メモはこのブラウザに保存されます。端末間の自動同期はありません。</p><div><button onClick={()=>setManagement(true)}>データ管理</button></div><p role="status">{message}</p></footer>
    </>}
  </div></KeywordDragProvider>;
}
