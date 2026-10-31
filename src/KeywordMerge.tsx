import { SearchField } from './SearchField';
import { KeywordCandidateList } from './KeywordCandidateList';
import { useState } from 'react';
import { mergeCandidates, keywords, mergeKeywords, type Data } from './model';
import { connectionCandidates } from './connectionCandidates';
export function KeywordMerge({word,data,apply,close}:{word:string;data:Data;apply:(data:Data,target:string)=>void;close:()=>void}) {
 const [target,setTarget]=useState(''),[category,setCategory]=useState(data.categories[word]??'未分類'),[search,setSearch]=useState(''),[filter,setFilter]=useState(''),[error,setError]=useState('');
 const order=mergeCandidates(data,word,search),all=connectionCandidates(data,word);
 const candidates=order.map(item=>all.find(candidate=>candidate.word === item)!).filter(item=>item && (!filter || item.category === filter));
 return <form className="keyword-merge-picker" onSubmit={event=>{event.preventDefault();try{apply(mergeKeywords(data,word,target,category),target);close();}catch(reason){setError((reason as Error).message);}}}>
  <div className="connect-dialog-controls"><div className="connect-heading"><h2>統合先を選択</h2><button type="button" onClick={close}>閉じる</button></div><p>*{word} の表記と登録情報を、選んだ語に統一します。</p><div className="connect-filters"><label>相手の分類<select value={filter} onChange={event=>{setFilter(event.target.value);setTarget('');}}><option value="">すべての分類</option>{data.categoryOrder.map(item=><option key={item}>{item}</option>)}</select></label><SearchField label="統合先を検索" placeholder="キーワードを検索" value={search} onChange={value=>{setSearch(value);setTarget('');}}/></div></div>
  <div className="connect-candidates" role="region" aria-label="統合先の候補"><KeywordCandidateList candidates={candidates} categories={data.categoryOrder} target={target} select={item=>{setTarget(item);setCategory(data.categories[item]??'未分類');setError('');}}/></div>
  <div className="connect-dialog-footer">{target ? <section className="connect-selection"><span>*{word} → <strong>*{target}</strong><small>{data.notes.filter(note=>keywords(note.text).includes(word)).length}件のメモと下書きを更新します。別名を残す場合は「同じ対象」を使います。</small><label>統合後の分類<select value={category} onChange={event=>setCategory(event.target.value)}>{data.categoryOrder.map(item=><option key={item}>{item}</option>)}</select></label></span></section> : <p className="muted">一覧から統合先を選んでください。</p>}{error && <p role="alert">{error}</p>}<div className="actions"><button type="button" onClick={close}>キャンセル</button><button className="primary" disabled={!target}>統合する</button></div></div>
 </form>;
}
