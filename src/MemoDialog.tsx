import { useEffect, useRef, useState } from 'react';
import { KeywordEditor } from './KeywordEditor';
import { useSmallScreen } from './useSmallScreen';

import { inputCandidates, applyInputCandidates, type InputCandidate } from './inputCandidates';

type Props = {
  title: string; value: string; onChange: (value: string) => void;
  registered: Set<string>; submitLabel: string; submit: () => void; close: () => void;
};

export function MemoDialog({title,value,onChange,registered,submitLabel,submit,close}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const outsidePress = useRef(false);
  const small = useSmallScreen();
  const [choosing,setChoosing]=useState(false);
  const [checked,setChecked]=useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<{text: string; candidates: InputCandidate[]}>({text: '', candidates: []});
  const [error, setError] = useState('');
  const candidates = snapshot.candidates;
  const chosen = candidates.filter(item => checked.includes(item.word));
  const dirty = choosing && value !== snapshot.text;
  function refreshCandidates() {
    const fresh = inputCandidates(value, registered);
    const previousWords = new Set(candidates.map(item => item.word));
    setChecked(fresh.filter(item => choosing && previousWords.has(item.word) ? checked.includes(item.word) : item.registered).map(item => item.word));
    setSnapshot({text: value, candidates: fresh}); setError('');
  }
  function keywordAction() {
    if (!choosing) {refreshCandidates(); setChoosing(true); return;}
    if (dirty || !chosen.length) return;
    try {
      onChange(applyInputCandidates(value, snapshot.text, candidates, checked));
      setChoosing(false); setError('');
      requestAnimationFrame(() => dialog.current?.querySelector('textarea')?.focus({preventScroll: true}));
    } catch (reason) {setError((reason as Error).message);}
  }
  useEffect(() => {
    const element = dialog.current!;
    const viewport = window.visualViewport;
    function resize() {
      element.style.setProperty('--memo-vh', (viewport?.height ?? window.innerHeight) + 'px');
      element.style.setProperty('--memo-vtop', (viewport?.offsetTop ?? 0) + 'px');
    }
    resize();
    element.showModal();
    element.querySelector('textarea')?.focus({preventScroll: true});
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      document.body.style.overflow = previous;
    };
  }, []);
  function outside(x: number, y: number) {
    const box = dialog.current!.getBoundingClientRect();
    return x < box.left || x > box.right || y < box.top || y > box.bottom;
  }
  return <dialog ref={dialog} className="settings-dialog memo-dialog" aria-label={title} onCancel={close}
    onPointerDown={event => { outsidePress.current = event.target === event.currentTarget && outside(event.clientX,event.clientY); }}
    onClick={event => { if(outsidePress.current && event.target === event.currentTarget && outside(event.clientX,event.clientY)) close(); outsidePress.current=false; }}>
    <form onSubmit={event=>{event.preventDefault();if(value.trim() && !choosing)submit();}}>
      <div className="memo-dialog-heading"><h2>{title}</h2></div>
      <div className="memo-dialog-body">
        <KeywordEditor label={title+'の本文'} value={value} onChange={onChange} registered={registered} fitViewport={small} selectionEnabled={!choosing} onSubmitShortcut={choosing ? undefined : submit}>
          {choosing && <section className="memo-keyword-picker" aria-label="キーワード候補">
            <div className="candidate-tools"><button type="button" onClick={refreshCandidates}>候補を更新</button></div>
            <p role="status">{dirty ? '文章が変わりました。「候補を更新」で選び直せます。' : '選んだ語だけキーワードにします。上の入力欄でスペースや表記を直せます。'}</p>
            {['登録済み','登録候補'].map(group=><section key={group}><h3>{group}</h3><div className="batch-picker">{candidates.filter(item=>item.registered===(group==='登録済み')).map(item=><button type="button" disabled={dirty} className="batch-chip" aria-pressed={checked.includes(item.word)} key={item.word} onClick={()=>setChecked(previous=>previous.includes(item.word)?previous.filter(word=>word!==item.word):[...previous,item.word])}>{checked.includes(item.word)?'✓ ':''}{item.word} <small>{item.ranges.length}か所</small></button>)}</div></section>)}
            {!candidates.length && <p>スペースで区切った語や、かっこで囲った語が候補になります。</p>}
            {error && <p role="alert">{error}</p>}
          </section>}
        </KeywordEditor>
      </div>
      <div className="memo-dialog-actions"><button type="button" onClick={choosing ? ()=>{setChoosing(false);setError('');} : keywordAction}>{choosing ? '入力に戻る' : 'キーワード化'}</button><button type="button" onClick={close}>閉じる</button><button type={choosing ? 'button' : 'submit'} className="primary" disabled={choosing ? dirty || !chosen.length : !value.trim()} onClick={choosing ? keywordAction : undefined}>{choosing ? chosen.length+'語を適用' : submitLabel}</button></div>
    </form>
  </dialog>;
}
