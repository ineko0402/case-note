import { completeOrder, moveRelative, sortCategory, type Data } from './model';
import { useDragOrder } from './useDragOrder';
type Props = { category: string; data: Data; counts: Map<string, number>; selected: string | null; select: (word: string) => void; update: (data: Data) => void; settings: () => void };
export function KeywordCategory({ category, data, counts, selected, select, update, settings }: Props) {
  const order = completeOrder(data.keywordOrder, [...counts.keys()]);
  const words = order.filter(word => (data.categories[word] ?? '未分類') === category);
  const groups = data.groups.filter(group => group.category === category);
  const drag = useDragOrder((_group, from, to, after) => update({ ...data, keywordOrder: moveRelative(order, from, to, after) }));
  if (!words.length && !groups.length) return null;
  function rows(items: string[], scope: string) {
    return items.map((word, index) => <div key={word} {...drag.row(scope, word)} className={'word-row ' + drag.row(scope, word).className}><button className="drag-handle" aria-label={`*${word}をドラッグして並べ替え`} {...drag.handle(scope, word)}>⠿</button><button className="word" aria-pressed={selected === word} onClick={() => select(word)}><span className="keyword-label">*{word}</span><span>{counts.get(word)}件</span></button><div className="word-moves"><button aria-label={`*${word}を上へ`} disabled={index === 0} onClick={() => update({ ...data, keywordOrder: moveRelative(order, word, items[index - 1], false) })}>↑</button><button aria-label={`*${word}を下へ`} disabled={index === items.length - 1} onClick={() => update({ ...data, keywordOrder: moveRelative(order, word, items[index + 1], true) })}>↓</button></div></div>);
  }
  return <section><div className="category-heading"><button className="category-toggle" aria-expanded={!data.collapsed.includes(category)} onClick={() => update({ ...data, collapsed: data.collapsed.includes(category) ? data.collapsed.filter(item => item !== category) : [...data.collapsed, category] })}><span>{data.collapsed.includes(category) ? '▸' : '▾'} <span className="category-kind">分類</span> {category}</span><span>{words.length}</span></button><button className="group-add" aria-label={`${category}のまとまりを設定`} onClick={settings}>＋</button></div>{!data.collapsed.includes(category) && <>{['時間', 'ナンバー'].includes(category) && <div className="category-tools"><button onClick={() => update(sortCategory(data, category))}>{category === '時間' ? '時刻順に並べる' : '番号順に並べる'}</button></div>}{rows(words.filter(word => !groups.some(group => group.members.includes(word))), category)}{groups.map(group => {
    const members = words.filter(word => group.members.includes(word));
    return <section key={group.id} className="keyword-group"><button className="group-toggle" aria-expanded={!group.collapsed} onClick={() => update({ ...data, groups: data.groups.map(item => item.id === group.id ? { ...item, collapsed: !item.collapsed } : item) })}><span>{group.collapsed ? '▸' : '▾'} <span className="group-kind">まとまり</span> {group.name}</span><span>{members.length}</span></button>{!group.collapsed && rows(members, group.id)}{!group.collapsed && !members.length && <p className="group-empty">キーワード未追加</p>}</section>;
  })}</>}</section>;
}
