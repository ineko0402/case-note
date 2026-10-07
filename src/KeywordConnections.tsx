import { LinkKindControl, updateLink } from './LinkKindControl';
import { type Data } from './model';
import { ActionMenu } from './ActionMenu';
type Props = { word: string; data: Data; update: (data: Data) => void; select: (word: string) => void; begin: (mode: 'list' | 'memo') => void; isChoosing: boolean };
export function KeywordConnections({ word, data, update, select, begin, isChoosing }: Props) {
  const links = data.links.filter(link => link.a === word || link.b === word);
  return <section className="keyword-details" aria-label="つながり"><div className="list-heading"><h3>つながり <span>{links.length}</span></h3><ActionMenu label="つなげる" title={`*${word}からつなげる`} disabled={isChoosing}>{close => <><button type="button" onClick={() => {close(); begin('list');}}>一覧から選ぶ</button><button type="button" onClick={() => {close(); begin('memo');}}>メモから選ぶ</button></>}</ActionMenu></div>{links.length === 0 && <p className="muted">つながりなし</p>}<div className="fixed-links">{links.map(link => {
    const other = link.a === word ? link.b : link.a;
    const confirmed = link.status === 'confirmed';
    return <div key={link.id} className={'connection ' + link.status}><span className="connection-line" aria-hidden="true"/><button type="button" className="linked-word" onClick={() => select(other)}>*{other}{link.kind === 'identity' && <small className="connection-kind">同一人物</small>}</button><button type="button" className="connection-toggle" aria-pressed={confirmed} aria-label={`*${word}と*${other}のつながりを確定`} title={confirmed ? 'クリックで仮に戻す' : 'クリックで確定にする'} onClick={() => updateLink(data, link, link.kind ?? 'related', confirmed ? 'tentative' : 'confirmed', update)}>{confirmed ? '確定' : '仮'}</button><ActionMenu label="⋯" title={`*${word} と *${other} のつながりを編集`}>{close => <><LinkKindControl data={data} link={link} update={update}/><button type="button" onClick={() => { if (window.confirm(`*${word} と *${other} のつながりを解除しますか？`)) {close(); update({ ...data, links: data.links.filter(item => item.id !== link.id) });} }}>つながりを外す</button></>}</ActionMenu></div>;
  })}</div></section>;
}
