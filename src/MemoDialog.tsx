import { useEffect, useRef, useState } from 'react';
import { KeywordEditor } from './KeywordEditor';
import { useSmallScreen } from './useSmallScreen';

import { inputCandidates } from './inputCandidates';
import { keywordize } from './model';

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
  const candidates=inputCandidates(value,registered);
  const chosen=candidates.filter(item=>checked.includes(item.word));
  function keywordAction(){
    if(!choosing){setChecked(candidates.filter(item=>item.registered).map(item=>item.word));setChoosing(true);return;}
    let next=value;
    for(const range of chosen.flatMap(item=>item.ranges).sort((a,b)=>b.start-a.start))next=keywordize(next,range.start,range.end,false).text;
    onChange(next);setChoosing(false);
    requestAnimationFrame(()=>dialog.current?.querySelector('textarea')?.focus({preventScroll:true}));
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
      <div className="memo-dialog-body">{choosing ? <section className="memo-keyword-picker" aria-label="キーワード候補"><p>ONにした語だけキーワードにします。同じ語はまとめて変換します。</p>{['登録済み','登録候補'].map(group=><section key={group}><h3>{group}</h3><div className="batch-picker">{candidates.filter(item=>item.registered===(group==='登録済み')).map(item=><button type="button" className="batch-chip" aria-pressed={checked.includes(item.word)} key={item.word} onClick={()=>setChecked(previous=>previous.includes(item.word)?previous.filter(word=>word!==item.word):[...previous,item.word])}>{checked.includes(item.word)?'✓ ':''}{item.word} <small>{item.ranges.length}か所</small></button>)}</div></section>)}{!candidates.length && <p>スペースで区切った語や、かっこで囲った語が候補になります。</p>}</section> : <KeywordEditor label={title+'の本文'} value={value} onChange={onChange} registered={registered} fitViewport={small} onSubmitShortcut={submit}/>}</div>
      <div className="memo-dialog-actions"><button type="button" onClick={keywordAction}>{choosing ? chosen.length ? chosen.length+'語をキーワード化' : '入力に戻る' : 'キーワード化'}</button><button type="button" onClick={close}>閉じる</button><button className="primary" disabled={!value.trim() || choosing}>{submitLabel}</button></div>
    </form>
  </dialog>;
}
