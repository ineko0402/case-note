import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { keywordize, selectionWords } from './model';
import { KeywordText } from './KeywordText';
type Props = { value: string; onChange: (value: string) => void; registered: Set<string>; id?: string; label?: string; placeholder?: string; autoFocus?: boolean; onSubmitShortcut?: () => void };
export function KeywordEditor({ value, onChange, registered, id, label, placeholder, autoFocus, onSubmitShortcut }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [height,setHeight]=useState(160);
  const driver=useRef<'edit'|'preview'>('edit');
  const syncing=useRef(false);
  function syncScroll(source: 'edit'|'preview') {
    if(syncing.current)return;
    driver.current=source;
    const from=source==='edit'?ref.current:preview.current, to=source==='edit'?preview.current:ref.current;
    if(!from||!to)return;
    const maxFrom=from.scrollHeight-from.clientHeight,maxTo=to.scrollHeight-to.clientHeight;
    const top=maxFrom>0?from.scrollTop/maxFrom*Math.max(0,maxTo):0;
    if(Math.abs(to.scrollTop-top)<1)return;
    syncing.current=true;to.scrollTop=top;
    requestAnimationFrame(()=>{syncing.current=false;});
  }
  useLayoutEffect(()=>{syncScroll(driver.current);},[value,height]);
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
  return <div className="keyword-editor" style={{'--editor-height':height+'px'} as CSSProperties} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSelection(null); }}>
    <div className="editor-display-controls"><small>プレビュー</small><label>欄の高さ<select aria-label="編集欄とプレビューの高さ" value={height} onChange={event=>setHeight(Number(event.target.value))}><option value={160}>短め</option><option value={240}>標準</option><option value={320}>広め</option></select></label></div>
    <div ref={preview} className="input-preview preview-surface" tabIndex={0} role="region" aria-label="入力プレビュー" onScroll={()=>syncScroll('preview')}>{value ? <KeywordText text={value}/> : <span className="preview-placeholder">入力すると、キーワード部分を強調して表示します。</span>}{value.endsWith('\n') && '\u200b'}</div>
    <textarea className="preview-surface" onScroll={()=>syncScroll('edit')} ref={ref} id={id} aria-label={label} autoFocus={autoFocus} placeholder={placeholder} value={value} onChange={event => { onChange(event.target.value); setSelection(null); }} onSelect={capture} onKeyDown={event => { if (!event.nativeEvent.isComposing && event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); onSubmitShortcut?.(); } if (event.key === 'Escape') setSelection(null); }}/>
    {selection && words.length > 0 && <div className="keyword-popup" role="group" aria-label="選択した文章をキーワード化" onMouseDown={event => event.preventDefault()}><div className="preview">{words.map((word, index) => <span key={index}>*{word} {registered.has(word) && <small>登録済</small>}</span>)}</div><div className="actions"><button type="button" onClick={() => apply(false)}>{words.length === 1 ? 'キーワードにする' : '分けて登録'}</button>{words.length > 1 && !/[\r\n]/u.test(selected) && <button type="button" onClick={() => apply(true)}>空白を除いて1個にする</button>}<button type="button" onClick={() => setSelection(null)} aria-label="キーワード化を閉じる">閉じる</button></div>{error && <p role="alert">{error}</p>}</div>}
  </div>;
}
