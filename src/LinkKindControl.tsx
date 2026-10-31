import { changeLink, type Data, type Link } from './model';
export function updateLink(data: Data, link: Link, kind: 'related'|'identity', status: Link['status'], update: (next: Data) => void) { update(changeLink(data,link.id,kind,status)); }
export function LinkKindControl({data,link,update}: {data:Data;link:Link;update:(data:Data)=>void}) {
 const identity=link.kind === 'identity';
 return <button type="button" className="link-kind-toggle" aria-pressed={identity} aria-label={`*${link.a}と*${link.b}を同じ対象として扱う`} title={identity ? 'クリックで関係ありに戻す' : 'クリックで同じ対象にする'} onClick={()=>updateLink(data,link,identity?'related':'identity',link.status,update)}>{identity?'同じ対象':'関係あり'}</button>;
}
