import { LinkKindControl, updateLink } from './LinkKindControl';
import { useState } from 'react';
import { connect, type Data } from './model';
type Props = { word: string; data: Data; update: (data: Data) => void; select: (word: string) => void; begin: () => void; isChoosing: boolean };
export function KeywordConnections({ word, data, update, select, begin, isChoosing }: Props) {
  const links = data.links.filter(link => link.a === word || link.b === word);
  return <section className="keyword-details" aria-label="結び"><div className="list-heading"><h3>結び</h3><button onClick={begin} disabled={isChoosing}>結ぶ</button></div>{links.length === 0 && <p className="muted">結びなし</p>}<div className="fixed-links">{links.map(link => {
    const other = link.a === word ? link.b : link.a;
    return <div key={link.id} className={'connection ' + link.status}><span className="connection-line" aria-hidden="true"/><button className="linked-word" onClick={() => select(other)}>*{other}</button><details className="connection-actions"><summary aria-label={`*${other}の結びを操作`}>{link.kind === 'identity' ? '同一人物 · ' : ''}{link.status === 'confirmed' ? '確定' : '仮'} ▾</summary><div><LinkKindControl data={data} link={link} update={update}/><button onClick={() => updateLink(data, link, link.kind ?? 'related', link.status === 'confirmed' ? 'tentative' : 'confirmed', update)}>{link.status === 'confirmed' ? '仮に戻す' : '確定にする'}</button><button onClick={() => { if (window.confirm(`*${word} と *${other} の結びを解除しますか？`)) update({ ...data, links: data.links.filter(item => item.id !== link.id) }); }}>結びを外す</button></div></details></div>;
  })}</div></section>;
}
export function ConnectionPicker({ source, words, data, update, close }: { source: string; words: string[]; data: Data; update: (data: Data) => void; close: () => void }) {
  const [search, setSearch] = useState('');
  return <section className="connection-picker" aria-label="結ぶ相手を選択"><div className="list-heading"><h2>*{source} と結ぶ</h2><button onClick={close}>キャンセル</button></div><p>一覧またはメモ内の相手を選んでください。新しい結びは「仮」になります。</p><input aria-label="結ぶ相手を検索" placeholder="キーワードを検索" value={search} onChange={event => setSearch(event.target.value)}/><div className="picker-words">{words.filter(word => word !== source && word.includes(search)).map(word => {
    const exists = data.links.some(link => (link.a === source && link.b === word) || (link.a === word && link.b === source));
    return <button key={word} disabled={exists} onClick={() => { update(connect(data, source, word, crypto.randomUUID())); close(); }}>*{word}{exists ? ' · 結び済' : ''}</button>;
  })}</div></section>;
}
