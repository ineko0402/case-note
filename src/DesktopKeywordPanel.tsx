import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ActionMenu } from './ActionMenu';
import { KeywordConnections } from './KeywordConnections';
import { changeKeywordCategory, type Data } from './model';
import { floatingPanelPosition } from './floatingPanel';
import './DesktopKeyword.css';

export type DesktopKeywordTarget = {word:string;anchor:HTMLButtonElement};
type Props = {target:DesktopKeywordTarget;data:Data;update:(data:Data)=>void;close:()=>void;select:(word:string)=>void;connect:(mode:'list'|'memo')=>void;rename:()=>void;merge:()=>void;showNotes:()=>void};
export function DesktopKeywordPanel({target,data,update,close,select,connect,rename,merge,showNotes}:Props) {
  const ref=useRef<HTMLDialogElement>(null);
  const closeRef=useRef(close);closeRef.current=close;
  useLayoutEffect(()=>{
    const element=ref.current!, anchor=target.anchor;
    const viewport=window.visualViewport;
    element.show();
    function position() {
      if (!anchor.isConnected) {closeRef.current();return;}
      const bounds={left:viewport?.offsetLeft??0,top:viewport?.offsetTop??0,width:viewport?.width??window.innerWidth,height:viewport?.height??window.innerHeight};
      const box=anchor.getBoundingClientRect();
      const scrollArea=anchor.closest('.notes-panel,.timeline-panel')?.getBoundingClientRect();
      if (box.bottom<Math.max(bounds.top,scrollArea?.top??bounds.top) || box.top>Math.min(bounds.top+bounds.height,scrollArea?.bottom??bounds.top+bounds.height)) {closeRef.current();return;}
      element.style.width=Math.min(390,bounds.width-24)+'px';
      element.style.maxHeight=Math.max(80,bounds.height-24)+'px';
      const pos=floatingPanelPosition(box,bounds,element.offsetWidth,element.offsetHeight);
      element.style.left=pos.left+'px';element.style.top=pos.top+'px';
    }
    function outside(event:MouseEvent) {
      const node=event.target as HTMLElement;
      if (document.querySelector('dialog:modal') || node.closest('dialog') || anchor.contains(node)) return;
      closeRef.current();
    }
    function escape(event:KeyboardEvent) {
      if(event.key==='Escape' && !document.querySelector('dialog:modal') && !document.querySelector('dialog.action-menu[open]')) {event.preventDefault();closeRef.current();}
    }
    position();element.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});
    const observer=new ResizeObserver(position);observer.observe(element);
    window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
    viewport?.addEventListener('resize',position);viewport?.addEventListener('scroll',position);
    document.addEventListener('click',outside);document.addEventListener('keydown',escape);
    return ()=>{
      const returnFocus=element.contains(document.activeElement);
      observer.disconnect();element.close();
      window.removeEventListener('resize',position);window.removeEventListener('scroll',position,true);
      viewport?.removeEventListener('resize',position);viewport?.removeEventListener('scroll',position);
      document.removeEventListener('click',outside);document.removeEventListener('keydown',escape);
      if (returnFocus && anchor.isConnected) anchor.focus({preventScroll:true});
    };
  },[target.anchor]);
  return createPortal(<dialog ref={ref} className="desktop-keyword-panel" aria-label={`*${target.word}の操作`} onCancel={event=>{event.preventDefault();close();}}>
    <div className="desktop-keyword-heading"><h2>*{target.word}</h2><button type="button" onClick={close} aria-label="キーワードの操作を閉じる">閉じる</button></div>
    <div className="desktop-keyword-tools"><ActionMenu label="つなげる" title={`*${target.word}からつなげる`}>{done=><><button type="button" onClick={()=>{done();connect('list');}}>一覧から選ぶ</button><button type="button" onClick={()=>{done();connect('memo');}}>メモから選ぶ</button></>}</ActionMenu><button type="button" onClick={showNotes}>関連メモを表示</button></div>
    <label className="desktop-keyword-category">分類<select value={data.categories[target.word]??'未分類'} onChange={event=>update(changeKeywordCategory(data,target.word,event.target.value))}>{data.categoryOrder.map(category=><option key={category}>{category}</option>)}</select></label>
    <div className="desktop-keyword-tools"><button type="button" onClick={rename}>名前を変更</button><button type="button" onClick={merge}>キーワードを統合</button></div>
    <div className="context-header"><KeywordConnections word={target.word} data={data} update={update} select={select} begin={connect} isChoosing={false} hideBegin/></div>
  </dialog>,document.body);
}
