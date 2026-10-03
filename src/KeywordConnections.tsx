import { useState } from 'react';
import { connect, type Data } from './model';
type Props = { word: string; data: Data; update: (data: Data) => void; select: (word: string) => void; begin: () => void; isChoosing: boolean };
export function KeywordConnections({ word, data, update, select, begin, isChoosing }: Props) {
  const links = data.links.filter(link => link.a === word || link.b === word);
  const category = data.categories[word] ?? '未分類';
  const groups = data.groups.filter(group => group.category === category);
  return <section className="keyword-details" aria-label="結びとまとまり"><div className="list-heading"><h3>結び</h3><button onClick={begin} disabled={isChoosing}>結ぶ</button></div>{links.length === 0 && <p className="muted">まだ結ばれていません。</p>}<div className="fixed-links">{links.map(link => {
    const other = link.a === word ? link.b : link.a;
    return <div key={link.id} className={'connection ' + link.status}><span className="connection-line" aria-hidden="true"/><button className="linked-word" onClick={() => select(other)}>*{other}</button><details className="connection-actions"><summary aria-label={`*${other}の結びを操作`}>{link.status === 'confirmed' ? '確定' : '仮'} ▾</summary><div><button onClick={() => update({ ...data, links: data.links.map(item => item.id === link.id ? { ...item, status: link.status === 'confirmed' ? 'tentative' : 'confirmed' } : item) })}>{link.status === 'confirmed' ? '仮に戻す' : '確定にする'}</button><button onClick={() => { if (window.confirm(`*${word} と *${other} の結びを解除しますか？`)) update({ ...data, links: data.links.filter(item => item.id !== link.id) }); }}>解除</button></div></details></div>;
  })}</div><details className="membership-details"><summary>まとまり</summary>{groups.length === 0 ? <p className="muted">左の「＋」から、この分類のまとまりを作れます。</p> : <div className="memberships">{groups.map(group => <label key={group.id}><input type="checkbox" checked={group.members.includes(word)} onChange={event => update({ ...data, groups: data.groups.map(item => item.id === group.id ? { ...item, members: event.target.checked ? [...item.members, word] : item.members.filter(member => member !== word) } : item) })}/>{group.name}</label>)}</div>}</details></section>;
}
export function ConnectionPicker({ source, words, data, update, close }: { source: string; words: string[]; data: Data; update: (data: Data) => void; close: () => void }) {
  const [search, setSearch] = useState('');
  return <section className="connection-picker" aria-label="結ぶ相手を選択"><div className="list-heading"><h2>*{source} と結ぶ</h2><button onClick={close}>キャンセル</button></div><p>一覧またはメモ内の相手を選んでください。新しい結びは「仮」になります。</p><input aria-label="結ぶ相手を検索" placeholder="キーワードを検索" value={search} onChange={event => setSearch(event.target.value)}/><div className="picker-words">{words.filter(word => word !== source && word.includes(search)).map(word => {
    const exists = data.links.some(link => (link.a === source && link.b === word) || (link.a === word && link.b === source));
    return <button key={word} disabled={exists} onClick={() => { update(connect(data, source, word, crypto.randomUUID())); close(); }}>*{word}{exists ? ' · 結び済' : ''}</button>;
  })}</div></section>;
}
