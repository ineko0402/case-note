import { useState } from 'react';
import { type Data, type Group } from './model';
export function GroupSettings({ category, data, update, close }: { category: string; data: Data; update: (data: Data) => void; close: () => void }) {
  const [name, setName] = useState(''); const [error, setError] = useState('');
  function available(next: string, id?: string) {
    if (!next || data.groups.some(group => group.category === category && group.name === next && group.id !== id)) { setError('空欄や同じ分類内で重複した名前は使えません。'); return false; }
    setError(''); return true;
  }
  const groups = data.groups.filter(group => group.category === category);
  function replace(group: Group) { update({ ...data, groups: data.groups.map(item => item.id === group.id ? group : item) }); }
  return <section className="category-settings"><div className="list-heading"><h2>{category}のまとまり</h2><button onClick={close}>閉じる</button></div><p className="muted">キーワードを選び、詳細欄で所属を選択します。複数のまとまりに入れられます。</p>{groups.map(group => <div className="category-row" key={group.id}><form onSubmit={event => { event.preventDefault(); const next = String(new FormData(event.currentTarget).get('name')).trim(); if (available(next, group.id)) replace({ ...group, name: next }); }}><input aria-label={`${group.name}のまとまり名`} name="name" defaultValue={group.name}/><button>変更</button></form><button onClick={() => { if (window.confirm(`「${group.name}」を削除しますか？キーワードと結びは残ります。`)) update({ ...data, groups: data.groups.filter(item => item.id !== group.id) }); }}>削除</button></div>)}<form className="add-category" onSubmit={event => { event.preventDefault(); const next = name.trim(); if (!available(next)) return; update({ ...data, groups: [...data.groups, { id: crypto.randomUUID(), category, name: next, members: [], collapsed: false }] }); setName(''); }}><input autoFocus aria-label="新しいまとまり名" placeholder="兄弟、仲良し、A陣営…" value={name} onChange={event => setName(event.target.value)}/><button>追加</button></form><p role="alert">{error}</p></section>;
}
