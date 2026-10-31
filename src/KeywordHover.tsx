import type { KeywordOccurrence } from './keywordOccurrence';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DraggableKeyword } from './KeywordDrag';
import { connectionPreviews, personWords, type Data } from './model';
import { floatingPanelPosition } from './floatingPanel';
import './DesktopKeyword.css';

export type KeywordInspection = {data:Data;active:string|null;enabled:boolean;pickTarget?:string|null;open:(word:string,anchor:HTMLButtonElement,occurrence?:KeywordOccurrence)=>void};
export function KeywordHover({word,className,inspection,occurrence}: {occurrence?:KeywordOccurrence;word:string;className:string;inspection:KeywordInspection}) {
  const [anchor,setAnchor] = useState<HTMLButtonElement|null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const id = useId();
  function hide() {if(timer.current)clearTimeout(timer.current);timer.current=null;setAnchor(null);}
  function reveal(element:HTMLButtonElement) {
    hide();
    if (!inspection.enabled || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
    timer.current=setTimeout(()=>{timer.current=null;if(element.isConnected)setAnchor(element);},300);
  }
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  useEffect(()=>{if(!inspection.enabled)hide();},[inspection.enabled]);
  return <>
    <DraggableKeyword word={word} className={className} pressed={word===inspection.active} onClick={event=>{hide();inspection.open(word,event.currentTarget,occurrence);}} buttonProps={{
      'aria-haspopup':'dialog','aria-describedby':anchor?id:undefined,
      onPointerEnter:event=>{if(event.pointerType==='mouse')reveal(event.currentTarget);},
      onPointerLeave:hide,onFocus:event=>reveal(event.currentTarget),onBlur:hide,onDragStart:hide,
      onKeyDown:event=>{if(event.key==='Escape')hide();},
    }}>*{word}</DraggableKeyword>
    {anchor && createPortal(<KeywordTooltip id={id} word={word} data={inspection.data} anchor={anchor} close={hide}/>,document.body)}
  </>;
}
function KeywordTooltip({id,word,data,anchor,close}: {id:string;word:string;data:Data;anchor:HTMLButtonElement;close:()=>void}) {
  const ref=useRef<HTMLDivElement>(null);
  useLayoutEffect(()=>{
    const element=ref.current!;
    function position() {
      const viewport=window.visualViewport;
      const bounds={left:viewport?.offsetLeft??0,top:viewport?.offsetTop??0,width:viewport?.width??window.innerWidth,height:viewport?.height??window.innerHeight};
      element.style.maxWidth=Math.min(320,bounds.width-24)+'px';
      element.style.maxHeight=Math.max(80,bounds.height-24)+'px';
      const pos=floatingPanelPosition(anchor.getBoundingClientRect(),bounds,element.offsetWidth,element.offsetHeight);
      element.style.left=pos.left+'px';element.style.top=pos.top+'px';
    }
    const dismiss=()=>close();
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};
    position();
    window.addEventListener('scroll',dismiss,true);window.addEventListener('resize',dismiss);
    window.addEventListener('keydown',escape);
    return ()=>{window.removeEventListener('scroll',dismiss,true);window.removeEventListener('resize',dismiss);window.removeEventListener('keydown',escape);};
  },[anchor]);
  const members=personWords(data,word);
  const links=connectionPreviews(data,word);
  return <div ref={ref} id={id} role="tooltip" className="keyword-tooltip"><strong>*{word}</strong>{members.length>1 && <p>同じ対象：{members.slice(0,4).map(item=>'*'+item).join(' ／ ')}{members.length>4 && ' ほか'}</p>}<span>つながり {links.length}</span>{!links.length?<p>つながりなし</p>:<ul>{links.slice(0,4).map(link=><li key={link.kind+':'+link.word}><span>*{link.word}</span><small>{link.kind==='identity'?'同じ対象かも · ':''}{link.status==='confirmed'?'確定':'仮'}</small></li>)}</ul>}{links.length>4&&<p>ほか{links.length-4}件</p>}<p>クリックで操作</p></div>;
}
