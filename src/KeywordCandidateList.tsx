import type { ConnectionCandidate } from './connectionCandidates';
type Props={candidates:ConnectionCandidate[];categories:string[];target:string|null;select:(word:string)=>void;disableLinked?:boolean};
export function KeywordCandidateList({candidates,categories,target,select,disableLinked=false}:Props) {
 function row(item:ConnectionCandidate){return <button type="button" key={item.word} disabled={disableLinked && !!item.status} aria-pressed={target === item.word} className={item.sharedNotes ? 'shared-candidate' : ''} onClick={()=>select(item.word)}><span>*{item.word}</span><small>分類：{item.category}</small>{item.sharedNotes>0 && <small>同じメモ {item.sharedNotes}件</small>}{disableLinked && item.status && <small>つながり済 · {item.status === 'confirmed'?'確定':'仮'}</small>}</button>;}
 const shared=candidates.filter(item=>item.sharedNotes>0);
 return <>{shared.length>0 && <section><h3>同じメモで使った相手 <span>{shared.length}</span></h3><div className="connect-chips">{shared.map(row)}</div></section>}{categories.map(category=>{const items=candidates.filter(item=>!item.sharedNotes && item.category === category);return items.length>0 && <section key={category}><h3>分類：{category} <span>{items.length}</span></h3><div className="connect-chips">{items.map(row)}</div></section>;})}{!candidates.length && <p className="muted">条件に合うキーワードがありません。</p>}</>;
}
