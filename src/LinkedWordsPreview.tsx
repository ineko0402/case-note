import { useEffect, useRef, useState } from 'react';
import { linkedWords, type Data } from './model';
import { KeywordConnections } from './KeywordConnections';
import './LinkedWordsPreview.css';

export function LinkedWordsPreview({word,data,select,update}: {word: string; data: Data; select: (word: string) => void; update: (data: Data) => void}) {
  const links = linkedWords(data, word);
  const [open,setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current!;
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <section className="linked-words-preview" aria-label={`*${word}のつながり`}>
    <div className="linked-words-heading"><span>つながり {links.length}</span>{links.length > 0 && <button type="button" onClick={()=>setOpen(true)}>すべて見る</button>}</div>
    {!links.length ? <p>つながりなし</p> : <div className="linked-words-chips">{links.slice(0,4).map(link => <button type="button" key={link.word} className={'linked-word-chip ' + link.status} title={`*${link.word} · ${link.status==='confirmed'?'確定':'仮'}${link.kind==='identity'?' · 同一人物':''}`} onClick={()=>select(link.word)}><span>*{link.word}</span><small>{link.kind==='identity'?'同一人物 · ':''}{link.status==='confirmed'?'確定':'仮'}</small></button>)}</div>}
    {open && <dialog ref={dialog} className="settings-dialog linked-words-dialog" aria-label={`*${word}のつながり一覧`} onCancel={()=>setOpen(false)}>
      <div className="linked-words-dialog-heading"><h2>*{word}のつながり</h2><button type="button" onClick={()=>setOpen(false)}>閉じる</button></div>
      <div className="context-header"><KeywordConnections word={word} data={data} update={update} select={other=>{setOpen(false);select(other);}} begin={()=>{}} isChoosing={false} hideBegin/></div>
    </dialog>}
  </section>;
}
