import { useEffect, useRef, useState } from 'react';
import { keywordize, keywords, selectionWords } from './model';
type Props = { value: string; onChange: (value: string) => void; registered: Set<string>; id?: string; label?: string; placeholder?: string; autoFocus?: boolean; onSubmitShortcut?: () => void };
export function KeywordEditor({ value, onChange, registered, id, label, placeholder, autoFocus, onSubmitShortcut }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const heightKey = 'case-note-editor-height';
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    try {
      const saved = Number(localStorage.getItem(heightKey));
      if (saved >= 120 && saved <= 600) element.style.height = saved + 'px';
    } catch { /* Storage may be unavailable; resizing still works. */ }
    const observer = new ResizeObserver(() => {
      try { localStorage.setItem(heightKey, String(Math.round(element.getBoundingClientRect().height))); } catch { /* Optional preference. */ }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const draftWords = keywords(value);
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
  return <div className="keyword-editor" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelection(null); }}>
    {draftWords.length > 0 && <div className="draft-keywords" role="region" aria-label="入力中のキーワード"><small>キーワード</small><div>{draftWords.map(word => <span className="draft-keyword" key={word}>*{word}</span>)}</div></div>}
    {selection && words.length > 0 && <div className="keyword-popup" role="group" aria-label="選択した文章をキーワード化" onMouseDown={event => event.preventDefault()}><div className="preview">{words.map((word, index) => <span key={index}>*{word} {registered.has(word) && <small>登録済</small>}</span>)}</div><div className="actions"><button type="button" onClick={() => apply(false)}>{words.length === 1 ? 'キーワードにする' : '分けて登録'}</button>{words.length > 1 && !/[\r\n]/u.test(selected) && <button type="button" onClick={() => apply(true)}>空白を除いて1個にする</button>}<button type="button" onClick={() => setSelection(null)} aria-label="キーワード化を閉じる">閉じる</button></div>{error && <p role="alert">{error}</p>}</div>}
    <textarea className="editor-input" ref={ref} id={id} aria-label={label} autoFocus={autoFocus} placeholder={placeholder} value={value} onChange={event => { onChange(event.target.value); setSelection(null); }} onSelect={capture} onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); onSubmitShortcut?.(); } if (event.key === 'Escape') setSelection(null); }}/>

  </div>;
}
