import { LinkKindControl, updateLink } from './LinkKindControl';
import { type Data } from './model';
type Props = { word: string; data: Data; update: (data: Data) => void; select: (word: string) => void; begin: (mode: 'list' | 'memo') => void; isChoosing: boolean };
export function KeywordConnections({ word, data, update, select, begin, isChoosing }: Props) {
  const links = data.links.filter(link => link.a === word || link.b === word);
  return <section className="keyword-details" aria-label="つながり"><div className="list-heading"><h3>つながり</h3><button onClick={() => begin('list')} disabled={isChoosing}>一覧からつなげる</button><button onClick={() => begin('memo')} disabled={isChoosing}>メモからつなげる</button></div>{links.length === 0 && <p className="muted">つながりなし</p>}<div className="fixed-links">{links.map(link => {
    const other = link.a === word ? link.b : link.a;
    return <div key={link.id} className={'connection ' + link.status}><span className="connection-line" aria-hidden="true"/><button className="linked-word" onClick={() => select(other)}>*{other}</button><details className="connection-actions"><summary aria-label={`*${other}のつながりを操作`}>{link.kind === 'identity' ? '同一人物 · ' : ''}{link.status === 'confirmed' ? '確定' : '仮'} ▾</summary><div><LinkKindControl data={data} link={link} update={update}/><button onClick={() => updateLink(data, link, link.kind ?? 'related', link.status === 'confirmed' ? 'tentative' : 'confirmed', update)}>{link.status === 'confirmed' ? '仮に戻す' : '確定にする'}</button><button onClick={() => { if (window.confirm(`*${word} と *${other} のつながりを解除しますか？`)) update({ ...data, links: data.links.filter(item => item.id !== link.id) }); }}>つながりを外す</button></div></details></div>;
  })}</div></section>;
}
