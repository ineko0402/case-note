import { createContext, useContext, useState, type DragEvent, type ReactNode } from 'react';
import { connect, keywordCounts, type Data } from './model';

const mime = 'application/x-case-note-keyword';
const Context = createContext<{source: string | null; target: string | null; start: (word: string) => void; hover: (word: string | null) => void; drop: (word: string) => void; clear: () => void} | null>(null);
export function KeywordDragProvider({data,update,children}:{data:Data;update:(data:Data)=>void;children:ReactNode}) {
  const [source,setSource]=useState<string|null>(null),[target,setTarget]=useState<string|null>(null),[message,setMessage]=useState('');
  function clear(){setSource(null);setTarget(null);}
  function drop(word:string){
    if(source && source!==word && keywordCounts(data).has(source) && keywordCounts(data).has(word)){
      const exists=data.links.some(link=>(link.a===source&&link.b===word)||(link.b===source&&link.a===word));
      if(!exists)update(connect(data,source,word,crypto.randomUUID()));
      setMessage(exists ? 'すでにつながっています。' : '*'+source+' と *'+word+' を仮につなげました。');
    }
    clear();
  }
  return <Context.Provider value={{source,target,start:word=>{setSource(word);setMessage('');},hover:setTarget,drop,clear}}>{children}<div className="drag-connect-status" role="status">{source?'相手のキーワードに重ねてつなげます。並び替えは左のハンドルを使います。':message}</div></Context.Provider>;
}
export function useKeywordDrag(word:string){
  const context=useContext(Context);
  if(!context)return {};
  const accepts=(event:DragEvent)=>context.source!==null && context.source!==word && event.dataTransfer.types.includes(mime);
  return {
    draggable:true,
    'data-connect-target':context.target===word || undefined,
    onDragStart:(event:DragEvent)=>{event.stopPropagation();event.dataTransfer.effectAllowed='link';event.dataTransfer.setData(mime,word);context.start(word);},
    onDragEnd:()=>context.clear(),
    onDragOver:(event:DragEvent)=>{if(accepts(event)){event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='link';context.hover(word);}},
    onDragLeave:(event:DragEvent)=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))context.hover(null);},
    onDrop:(event:DragEvent)=>{if(accepts(event)){event.preventDefault();event.stopPropagation();context.drop(word);}}
  };
}
export function DraggableKeyword({word,children,onClick,className,pressed}:{word:string;children:ReactNode;onClick:()=>void;className?:string;pressed?:boolean}){
  const drag=useKeywordDrag(word);
  return <button {...drag} className={className} aria-pressed={pressed} onClick={onClick}>{children}</button>;
}
