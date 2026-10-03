import { useState } from 'react';
import { moveRelative, renameCategory, deleteCategory, type Data } from './model';
import { useDragOrder } from './useDragOrder';
type Props = { data: Data; update: (data: Data) => void; close: () => void };
export function CategorySettings({ data, update, close }: Props) {
  const [name, setName] = useState(''); const [error, setError] = useState(''); const dragOrder = useDragOrder((_group, from, to, after) => update({ ...data, categoryOrder: moveRelative(data.categoryOrder, from, to, after) }));
  function rename(category: string, next: string) {
    next = next.trim();
    if (!next || (next !== category && data.categoryOrder.includes(next))) { setError('空欄や重複した分類名は使えません。'); return; }
    update(renameCategory(data, category, next)); setError('');
  }
  function move(category: string, direction: number) {
    const order = [...data.categoryOrder]; const index = order.indexOf(category); const target = index + direction;
    if (target < 1 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]]; update({ ...data, categoryOrder: order });
  }
  return <section className="category-settings" aria-label="分類設定"><div className="list-heading"><h2>分類設定</h2><button onClick={close}>閉じる</button></div><p className="muted">未分類は固定です。ほかの分類はドラッグ、または上下ボタンで並べ替えられます。</p>{data.categoryOrder.map((category, index) => <div key={category} {...(index > 0 ? dragOrder.row('categories', category) : {})} className={'category-row ' + (index > 0 ? dragOrder.row('categories', category).className : '')}>
    {index > 0 && <button className="drag-handle" aria-label={`${category}をドラッグして並べ替え`} {...dragOrder.handle('categories', category)}>⠿</button>}
    {index === 0 ? <span>未分類</span> : <><form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); rename(category, String(form.get('name'))); }}><input name="name" aria-label={`${category}の分類名`} defaultValue={category}/><button>変更</button></form><div className="actions"><button aria-label={`${category}を上へ`} disabled={index === 1} onClick={() => move(category, -1)}>↑</button><button aria-label={`${category}を下へ`} disabled={index === data.categoryOrder.length - 1} onClick={() => move(category, 1)}>↓</button><button onClick={() => { if (window.confirm(`「${category}」を削除します。キーワードは未分類に戻り、この分類のまとまりを削除します。`)) update(deleteCategory(data, category)); }}>削除</button></div></>}
  </div>)}<form className="add-category" onSubmit={event => { event.preventDefault(); const next = name.trim(); if (!next || data.categoryOrder.includes(next)) { setError('空欄や重複した分類名は使えません。'); return; } update({ ...data, categoryOrder: [...data.categoryOrder, next] }); setName(''); setError(''); }}><input aria-label="新しい分類名" placeholder="新しい分類名" value={name} onChange={event => setName(event.target.value)}/><button>追加</button></form><p role="alert">{error}</p></section>;
}
