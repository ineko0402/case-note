import { KeywordCandidateList } from './KeywordCandidateList';
import { SearchField } from './SearchField';
import { useEffect, useRef } from 'react';
import type { ConnectionCandidate, ConnectionOptions } from './connectionCandidates';
import './ConnectionPicker.css';

type Props = {
  source: string; categories: string[]; candidates: ConnectionCandidate[];
  options: ConnectionOptions; change: (options: ConnectionOptions) => void;
  submit: () => void; close: () => void; undo?: () => void;
};

function ConnectionControls({source, categories, options, change, close}: Props) {
  function filter(patch: Partial<ConnectionOptions>) {change({...options, ...patch, target: null});}
  return <>
    <div className="connect-heading"><h2>*{source} とつなげる</h2><button type="button" onClick={close}>{options.mode === 'memo' ? '終了' : '閉じる'}</button></div>
    <div className="connect-modes" aria-label="相手の選び方"><button type="button" aria-pressed={options.mode === 'list'} onClick={() => change({...options, mode: 'list', target: null})}>一覧から選ぶ</button><button type="button" aria-pressed={options.mode === 'memo'} onClick={() => change({...options, mode: 'memo', target: null})}>メモから選ぶ</button></div>
    <div className="connect-filters">
      <label>相手の分類<select value={options.category ?? ''} onChange={event => filter({category: event.target.value || null})}><option value="">すべての分類</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
      <SearchField label="つなげる相手を検索" placeholder="相手のキーワードを検索" value={options.query} onChange={query => filter({query})}/>
      {(options.category !== null || options.query || options.onlyShared || options.hideConnected) && <button type="button" onClick={() => filter({category: null, query: '', onlyShared: false, hideConnected: false})}>絞り込みを解除</button>}
    </div>
    <div className="connect-checks">{options.mode === 'list' && <label><input type="checkbox" checked={options.onlyShared} onChange={event => filter({onlyShared: event.target.checked})}/>同じメモで使った相手のみ</label>}<label><input type="checkbox" checked={options.hideConnected} onChange={event => filter({hideConnected: event.target.checked})}/>つながり済みを隠す</label></div>
  </>;
}

export function ConnectionCommit({source, candidates, options, change, submit, undo}: Props) {
  const target = candidates.find(item => item.word === options.target);
  return <>
    <div className="connect-selection" aria-label="つなげる相手の確認"><span>{target ? <>*{source} → <strong>*{target.word}</strong> <small>分類：{target.category}</small></> : options.mode === 'memo' ? '本文中の強調されたキーワードを選んでください。' : '一覧から相手を選んでください。'}</span><button type="button" className="primary" disabled={!target || !!target.status} onClick={submit}>仮につなげる</button></div>
    <div className="connect-meta"><label><input type="checkbox" checked={options.continueConnecting} onChange={event => change({...options, continueConnecting: event.target.checked})}/>続けてつなげる</label><span>{candidates.length}候補 · {candidates.filter(item => !item.status).length}件を選択可能</span></div>
    <div className="connect-feedback"><span role="status">{options.feedback || '同じメモで使ったことは、つながりの確定を意味しません。'}</span>{undo && <button type="button" onClick={undo}>直前のつながりを取り消す</button>}</div>
  </>;
}

export function ConnectionMemoToolbar(props: Props) {
  return <section className="connect-memo-toolbar" aria-label="メモからつなげる相手を選択"><ConnectionControls {...props}/><ConnectionCommit {...props}/></section>;
}

export function ConnectionPickerDialog(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const outsidePress = useRef(false);
  useEffect(() => {
    const element = dialog.current!;
    const viewport = window.visualViewport;
    function resize() {
      element.style.setProperty('--connect-vh', (viewport?.height ?? window.innerHeight) + 'px');
      element.style.setProperty('--connect-vtop', (viewport?.offsetTop ?? 0) + 'px');
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
  }, []);
  function outside(x: number, y: number) {
    const box = dialog.current!.getBoundingClientRect();
    return x < box.left || x > box.right || y < box.top || y > box.bottom;
  }
  const {options, change, candidates, categories} = props;
  return <dialog ref={dialog} className="settings-dialog connect-dialog" aria-label={`*${props.source} とつなげる相手を選択`} onCancel={props.close}
    onPointerDown={event => {outsidePress.current = event.target === event.currentTarget && outside(event.clientX, event.clientY);}}
    onClick={event => {if (outsidePress.current && event.target === event.currentTarget && outside(event.clientX, event.clientY)) props.close(); outsidePress.current = false;}}>
    <div className="connect-dialog-controls"><ConnectionControls {...props}/></div>
    <div className="connect-candidates" tabIndex={0} aria-label="つなげる相手の候補">
      <KeywordCandidateList candidates={candidates} categories={categories} target={options.target} select={word=>change({...options,target:options.target === word?null:word})} disableLinked/>
    </div>
    <div className="connect-dialog-footer"><ConnectionCommit {...props}/></div>
  </dialog>;
}

export function ConnectionInlineToolbar(props:Props) {return <section className="inline-connect-toolbar" aria-label="表示中のメモから相手を選択"><div className="connect-heading"><h2>*{props.source} の相手を本文から選択</h2><button type="button" onClick={props.close}>終了</button></div><ConnectionCommit {...props}/></section>;}
