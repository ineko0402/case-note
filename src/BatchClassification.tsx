import { useState, type Dispatch, type SetStateAction } from 'react';
import { classifyUnassigned, type Data } from './model';
export function BatchClassification({ data, words, update, close }: { data: Data; words: string[]; update: Dispatch<SetStateAction<Data>>; close: () => void }) {
  const [checked, setChecked] = useState<string[]>([]);
  const options = data.categoryOrder.filter(category => category !== '未分類');
  const [category, setCategory] = useState(options[0] ?? '');
  const available = words.filter(word => (data.categories[word] ?? '未分類') === '未分類');
  const selected = checked.filter(word => available.includes(word));
  return <section className="category-settings"><div className="list-heading"><h2>未分類をまとめて分類</h2><button onClick={close}>閉じる</button></div><div className="batch-tools"><button onClick={() => setChecked(available)}>未分類をすべて選択</button><button onClick={() => setChecked([])}>選択解除</button><span>{selected.length}個選択</span></div><div className="batch-words">{available.map(word => <label key={word}><input type="checkbox" checked={selected.includes(word)} onChange={event => setChecked(event.target.checked ? [...checked, word] : checked.filter(item => item !== word))}/><span>*{word}</span></label>)}{!available.length && <p>未分類のキーワードはありません。</p>}</div><form className="batch-tools" onSubmit={event => { event.preventDefault(); if (!selected.length || !options.includes(category)) return; update(previous => classifyUnassigned(previous, selected, category)); close(); }}><label>分類先 <select value={category} onChange={event => setCategory(event.target.value)}>{options.map(option => <option key={option}>{option}</option>)}</select></label><button className="primary" disabled={!selected.length || !options.includes(category)}>まとめて設定</button></form>{!options.length && <p>分類設定で分類を追加してください。</p>}</section>;
}
