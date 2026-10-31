import { LinkKindControl, updateLink } from './LinkKindControl';
import { personWords, groupedConnections, type Data, type Link } from './model';
import './KeywordOrganizer.css';
type Props = {word:string;data:Data;update:(data:Data)=>void;select:(word:string)=>void;begin:(mode:'list'|'memo')=>void;isChoosing:boolean;hideBegin?:boolean};
function EditLink({link,data,update}: {link:Link;data:Data;update:(data:Data)=>void}) {
 return <div className="organizer-link-edit"><span>*{link.a} ↔ *{link.b}</span><div><LinkKindControl data={data} link={link} update={update}/><button type="button" aria-pressed={link.status === 'confirmed'} onClick={()=>updateLink(data,link,link.kind??'related',link.status === 'confirmed'?'tentative':'confirmed',update)}>{link.status === 'confirmed'?'確定':'仮'}</button><button type="button" onClick={()=>{if(window.confirm(`*${link.a} と *${link.b} のつながりを外しますか？ 別の確定した経路が残る場合は、同じ対象のまとまりは維持されます。`))update({...data,links:data.links.filter(item=>item.id !== link.id)});}}>つながりを外す</button></div></div>;
}
export function KeywordConnections({word,data,update,select,begin,isChoosing,hideBegin=false}:Props) {
 const members=personWords(data,word);
 const identities=data.links.filter(link=>link.kind === 'identity' && link.status === 'confirmed' && members.includes(link.a) && members.includes(link.b));
 const groups=groupedConnections(data,word);
 const candidates=groups.filter(group=>group.links.some(link=>link.kind === 'identity' && link.status === 'tentative'));
 const relations=groups.filter(group=>group.links.some(link=>link.kind !== 'identity'));
 return <section className="keyword-details keyword-organizer" aria-label="名前とつながり">
  {!hideBegin && <button type="button" disabled={isChoosing} onClick={()=>begin('list')}>つなげる…</button>}
  {members.length>1 && <details className="organizer-section" open><summary>同じ対象 <span>{members.length}語</span></summary><div className="organizer-aliases">{members.map(member=><button type="button" key={member} aria-pressed={member === word} onClick={()=>select(member)}>*{member}</button>)}</div><details className="organizer-membership"><summary>まとめ方を変更</summary><p className="muted">確定したつながりでまとまっています。語の表記は変更しません。</p>{identities.map(link=><EditLink key={link.id} link={link} data={data} update={update}/>)}</details></details>}
  {candidates.length>0 && <details className="organizer-section"><summary>同じ対象かも <span>{candidates.length}候補</span></summary>{candidates.map(group=><details className="organizer-peer tentative" key={group.word}><summary>*{group.word} · 仮</summary><button type="button" onClick={()=>select(group.word)}>相手の操作を開く</button>{group.links.filter(link=>link.kind === 'identity').map(link=><EditLink key={link.id} link={link} data={data} update={update}/>)}</details>)}</details>}
  <div className="organizer-section"><h3>ほかの対象とのつながり <span>{relations.length}</span></h3>{!relations.length && <p className="muted">つながりなし</p>}{relations.map(group=><details className="organizer-peer" key={group.word}><summary><span>*{group.word}{group.members.length>1 && <small> ＋別名{group.members.length-1}</small>}</span><small>{group.links.some(link=>link.kind !== 'identity' && link.status === 'confirmed')?'確定':'仮'}</small></summary><button type="button" onClick={()=>select(group.word)}>相手の操作を開く</button>{group.links.filter(link=>link.kind !== 'identity').map(link=><EditLink key={link.id} link={link} data={data} update={update}/>)}</details>)}</div>
 </section>;
}
