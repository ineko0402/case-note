import { useEffect, useRef } from 'react';
import { MemoTitle } from './MemoTitle';
import type { KeywordClassification } from './model';
import { KeywordEditor } from './KeywordEditor';
import { useSmallScreen } from './useSmallScreen';

type Props = {
  title: string; value: string; onChange: (value: string, classification?: KeywordClassification) => void;
  memoTitle:string;onTitleChange:(title:string)=>void; error?:string;
  registered: Set<string>; submitLabel: string; submit: () => void; close: () => void;
};

export function MemoDialog({title,value,onChange,memoTitle,onTitleChange,error,registered,submitLabel,submit,close}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const outsidePress = useRef(false);
  const small = useSmallScreen();
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
    <form onSubmit={event=>{event.preventDefault();if(value.trim())submit();}}>
      <div className="memo-dialog-heading"><h2>{title}</h2></div>
      <div className="memo-dialog-body">
        <MemoTitle value={memoTitle} onChange={onTitleChange}/>
        <KeywordEditor label={title+'の本文'} value={value} onChange={onChange} registered={registered} fitViewport={small} onSubmitShortcut={submit}/>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="memo-dialog-actions"><button type="button" onClick={close}>閉じる</button><button type="submit" className="primary" disabled={!value.trim()}>{submitLabel}</button></div>
    </form>
  </dialog>;
}
