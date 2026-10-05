import { SearchField } from './SearchField';
import { DraggableKeyword } from './KeywordDrag';
import { useState } from 'react';
import { keywordCounts, keywords, personWords, type Data } from './model';
export function ConnectionsOverview({data,openNotes,select}:{data:Data;openNotes:(word:string)=>void;select:(word:string)=>void}) {
  const [category,setCategory]=useState('すべて');
  const [search,setSearch]=useState('');
  const seen=new Set<string>();
  const cards=[...keywordCounts(data).keys()].flatMap(word=>{
    if(seen.has(word))return [];
    const members=personWords(data,word);members.forEach(item=>seen.add(item));
    const peers=new Map<string,{members:string[];confirmed:boolean;identity:boolean}>();
    for(const link of data.links){
      const other=members.includes(link.a)?link.b:members.includes(link.b)?link.a:null;
      if(!other||members.includes(other))continue;
      const target=personWords(data,other),key=target.join('\u0000'),previous=peers.get(key);
      peers.set(key,{members:target,confirmed:previous?.confirmed===true||link.status==='confirmed',identity:previous?.identity===true||link.kind==='identity'});
    }
    return [{members,peers:[...peers.values()]}];
  }).filter(card=>card.members.some(word=>category==='すべて'||(category==='人物・ナンバー'?['人物','ナンバー'].includes(data.categories[word]??'未分類'):(data.categories[word]??'未分類')===category))&&[...card.members,...card.peers.flatMap(peer=>peer.members)].some(word=>word.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  return <section className="connections-overview" aria-label="つながり一覧"><div className="overview-tools"><label>表示するキーワードの分類<select value={category} onChange={event=>setCategory(event.target.value)}><option>すべて</option><option>人物・ナンバー</option>{data.categoryOrder.map(item=><option key={item}>{item}</option>)}</select></label><SearchField label="つながりを検索" placeholder="キーワードを検索" value={search} onChange={setSearch}/>{(category!=='すべて'||search!=='')&&<button onClick={()=>{setCategory('すべて');setSearch('');}}>すべて表示</button>}</div><p className="muted">登録したつながりを自動で表示します。仮のつながりは淡く、確定したつながりは濃く表示します。</p><div className="connection-cards">{cards.map(card=><article key={card.members.join('\u0000')}><header><h2>{card.members.map(word=><DraggableKeyword word={word} key={word} onClick={()=>select(word)}>*{word}</DraggableKeyword>)}</h2><button onClick={()=>openNotes(card.members[0])}>関連メモ {data.notes.filter(note=>keywords(note.text).some(word=>card.members.includes(word))).length}件</button></header>{card.members.length>1&&<p className="muted">同一人物 · 確定</p>}{data.categoryOrder.map(item=>{
    const peers=card.peers.filter(peer=>(data.categories[peer.members[0]]??'未分類')===item);
    return peers.length>0&&<section className="connection-category" key={item}><h3>分類：{item}</h3><div>{peers.map(peer=><DraggableKeyword word={peer.members[0]} key={peer.members.join('\u0000')} className={'connection-peer '+(peer.confirmed?'confirmed':'tentative')} onClick={()=>openNotes(peer.members[0])}>{peer.members.map(word=>'*'+word).join(' ／ ')} <small>{peer.identity?'同一人物 · ':''}{peer.confirmed?'確定':'仮'}</small></DraggableKeyword>)}</div></section>;
  })}{!card.peers.length&&<p className="muted">つながりなし</p>}</article>)}</div>{!cards.length&&<p className="muted">{category!=='すべて'||search!=='' ? '絞り込みに一致するキーワードはありません。「すべて表示」で絞り込みを解除できます。' : 'キーワードがまだありません。メモからキーワードを登録すると、ここに表示されます。'}</p>}</section>;
}
