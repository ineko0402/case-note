import { canIdentify, changeLink, identityConflicts, type Data, type Link } from './model';
export function updateLink(data: Data, link: Link, kind: 'related'|'identity', status: Link['status'], update: (next: Data) => void) {
 const conflicts=identityConflicts(data,{...link,kind,status});
 if(conflicts.length && !window.confirm('以下の同一人物の確定を仮に戻し、新しい相手を確定しますか？\n'+conflicts.map(other=>`*${other.a} と *${other.b}`).join('\n')))return;
 update(changeLink(data,link.id,kind,status,conflicts.length>0));
}
export function LinkKindControl({data,link,update}: {data: Data; link: Link; update: (next: Data) => void}) {
 return <label className="link-kind">結びの種類<select aria-label={`*${link.a}と*${link.b}の結びの種類`} value={link.kind??'related'} onChange={event=>updateLink(data,link,event.target.value as 'related'|'identity',link.status,update)}><option value="related">関係あり</option><option value="identity" disabled={!canIdentify(data,link)}>同一人物</option></select></label>;
}
