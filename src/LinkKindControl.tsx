import { canIdentify, changeLink, identityConflicts, type Data, type Link } from './model';
export function updateLink(data: Data, link: Link, kind: 'related'|'identity', status: Link['status'], update: (next: Data) => void) {
 const conflicts=identityConflicts(data,{...link,kind,status});
 if(conflicts.length && !window.confirm('以下の同一人物の確定を仮に戻し、新しい相手を確定しますか？\n'+conflicts.map(other=>`*${other.a} と *${other.b}`).join('\n')))return;
 update(changeLink(data,link.id,kind,status,conflicts.length>0));
}
export function LinkKindControl({data,link,update}: {data: Data; link: Link; update: (next: Data) => void}) {
 const identity = link.kind === 'identity';
 const disabled = !identity && !canIdentify(data,link);
 return <button type="button" className="link-kind-toggle" aria-pressed={identity} disabled={disabled}
   aria-label={`*${link.a}と*${link.b}を同一人物として扱う`}
   title={disabled ? '同一人物はナンバーと人物の間で指定できます' : identity ? 'クリックで関係ありに戻す' : 'クリックで同一人物にする'}
   onClick={()=>updateLink(data,link,identity?'related':'identity',link.status,update)}>{identity?'同一人物':'関係あり'}</button>;
}
