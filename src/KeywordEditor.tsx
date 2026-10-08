import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { keywordize, keywords, selectionWords } from './model';
import { keywordSuggestions } from './inputHelp';
import { inputCandidates, applyInputCandidates, type InputCandidate } from './inputCandidates';
import { mobileEditorHeight } from './editorHeight';
type Props = { value: string; onChange: (value: string) => void; registered: Set<string>; id?: string; label?: string; placeholder?: string; autoFocus?: boolean; onSubmitShortcut?: () => void; fitViewport?: boolean };
export function KeywordEditor({ value, onChange, registered, id, label, placeholder, autoFocus, onSubmitShortcut, fitViewport = false }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const heightKey = 'case-note-editor-height';
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !fitViewport) return;
    const viewport = window.visualViewport;
    const body = element.closest<HTMLElement>('.memo-dialog-body');
    let width = element.clientWidth;
    function resize() {
      const scrollTop = element!.scrollTop;
      element!.style.setProperty('--editor-auto-height', '0px');
      const border = element!.offsetHeight - element!.clientHeight;
      const height = mobileEditorHeight(element!.scrollHeight + border,
        viewport?.height ?? window.innerHeight, body?.clientHeight ?? window.innerHeight);
      element!.style.setProperty('--editor-auto-height', height + 'px');
      element!.scrollTop = scrollTop;
    }
    resize();
    const observer = new ResizeObserver(() => {
      if (element.clientWidth === width) return;
      width = element.clientWidth;
      resize();
    });
    observer.observe(element);
    viewport?.addEventListener('resize', resize);
    window.addEventListener('resize', resize);
    return () => {
      observer.disconnect();
      viewport?.removeEventListener('resize', resize);
      window.removeEventListener('resize', resize);
      element.style.removeProperty('--editor-auto-height');
    };
  }, [value, fitViewport]);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (fitViewport) { element.style.removeProperty('height'); return; }
    try {
      const saved = Number(localStorage.getItem(heightKey));
      if (saved >= 120 && saved <= 600) element.style.height = saved + 'px';
    } catch { /* Storage may be unavailable; resizing still works. */ }
    const observer = new ResizeObserver(() => {
      try { localStorage.setItem(heightKey, String(Math.round(element.getBoundingClientRect().height))); } catch { /* Optional preference. */ }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitViewport]);
  const [composing, setComposing] = useState(false);
  const suggestions = composing ? [] : keywordSuggestions(value, registered);
  const draftWords = keywords(value);
  const newCandidates = composing ? [] : inputCandidates(value, registered).filter(item => !item.registered).slice(0, 8);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [error, setError] = useState('');
  const selected = selection ? value.slice(selection.start, selection.end) : '';
  const words = selectionWords(selected);
  function capture() {
    const element = ref.current;
    setError('');
    setSelection(element && element.selectionStart !== element.selectionEnd && element.value.slice(element.selectionStart, element.selectionEnd).trim() ? { start: element.selectionStart, end: element.selectionEnd } : null);
  }
  function apply(merge: boolean) {
    if (!selection) return;
    try {
      const result = keywordize(value, selection.start, selection.end, merge);
      onChange(result.text); setSelection(null);
      requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(result.caret, result.caret); });
    } catch (cause) { setError((cause as Error).message); }
  }
  function applyCandidate(item: InputCandidate) {
    onChange(applyInputCandidates(value, value, [item], [item.word]));
    setSelection(null); setError('');
    requestAnimationFrame(() => ref.current?.focus({preventScroll: true}));
  }
  return <div className="keyword-editor" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelection(null); }}>
    <textarea onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} className="editor-input" ref={ref} id={id} aria-label={label} autoFocus={autoFocus} placeholder={placeholder} value={value} onChange={event => { onChange(event.target.value); setSelection(null); }} onSelect={capture} onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); onSubmitShortcut?.(); } if (event.key === 'Escape') setSelection(null); }}/>
    {draftWords.length > 0 && <div className="draft-keywords" role="region" aria-label="入力中のキーワード"><small>キーワード</small><div>{draftWords.map(word => <span className="draft-keyword" key={word}>*{word}</span>)}</div></div>}
    {selection && words.length > 0 && <div className="keyword-popup" role="group" aria-label="選択した文章をキーワード化" onMouseDown={event => event.preventDefault()}><div className="preview">{words.map((word, index) => <span key={index}>*{word} {registered.has(word) && <small>登録済</small>}</span>)}</div><div className="actions"><button type="button" onClick={() => apply(false)}>{words.length === 1 ? 'キーワードにする' : '分けて登録'}</button>{words.length > 1 && !/[\r\n]/u.test(selected) && <button type="button" onClick={() => apply(true)}>空白を除いて1個にする</button>}<button type="button" onClick={() => setSelection(null)} aria-label="キーワード化を閉じる">閉じる</button></div>{error && <p role="alert">{error}</p>}</div>}
    {suggestions.length > 0 && <div className="keyword-suggestions" aria-label="登録済みキーワードの候補"><small>キーワードにする候補（1か所ずつ）</small><div>{suggestions.map(item=><button type="button" key={item.word} onClick={()=>{const result=keywordize(value,item.start,item.end,false);onChange(result.text);setSelection(null);requestAnimationFrame(()=>{ref.current?.focus();ref.current?.setSelectionRange(result.caret,result.caret);});}}>*{item.word}</button>)}</div></div>}

    {newCandidates.length > 0 && <div className="draft-keywords" aria-label="未登録のキーワード候補"><small>登録候補</small><div>{newCandidates.map(item => <button type="button" className="draft-keyword draft-keyword-button" key={item.word} aria-label={`${item.word}をキーワードにする（${item.ranges.length}か所）`} title={`${item.word}をキーワードにする（${item.ranges.length}か所）`} onClick={() => applyCandidate(item)}>{item.word}</button>)}</div></div>}
  </div>;
}
