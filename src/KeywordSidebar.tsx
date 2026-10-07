import { Icon } from './Icon';
import './Icon.css';
import type { RefObject } from 'react';
import type { Data } from './model';
import { KeywordCategory } from './KeywordCategory';
type Props = { data: Data; counts: Map<string, number>; selected: string | null; setSelected: (word: string | null) => void; selectKeyword: (word: string) => void; setData: (data: Data) => void; settings: boolean; setSettings: (value: boolean) => void; setBatch: (value: boolean) => void; setNumbers: (value: boolean) => void; hide: () => void; keywordPanel: RefObject<HTMLElement | null>; onScroll: (top: number) => void };
export function KeywordSidebar({data, counts, selected, setSelected, selectKeyword, setData, setSettings, settings, setBatch, setNumbers, hide, keywordPanel, onScroll}: Props) {
 const visibleCategories = data.categoryOrder.filter(category => category === 'ナンバー' || [...counts.keys()].some(word => (data.categories[word] ?? '未分類') === category));
 const allClosed = visibleCategories.every(category => data.collapsed.includes(category));
 return <aside ref={keywordPanel} tabIndex={0} aria-label="キーワード一覧" onScroll={event => { onScroll(event.currentTarget.scrollTop); }}><div className="list-heading keyword-sidebar-heading"><h2>キーワード</h2><button type="button" onClick={hide}>一覧を隠す</button><button type="button" className="icon-button" aria-label="分類設定" title="分類設定" aria-haspopup="dialog" onClick={() => setSettings(!settings)}><Icon name="settings"/></button></div><button className="all" aria-pressed={!selected} onClick={() => setSelected(null)}>すべてのメモ <span>{data.notes.length}</span></button>{visibleCategories.length > 1 && <div className="keyword-sidebar-tools"><button type="button" onClick={() => setData({ ...data, collapsed: allClosed ? [] : [...data.categoryOrder] })}>{allClosed ? '分類をすべて開く' : '分類をすべて閉じる'}</button></div>}{data.categoryOrder.map(category => <KeywordCategory key={category} category={category} data={data} counts={counts} selected={selected} select={selectKeyword} update={setData} classify={() => setBatch(true)} addNumbers={() => setNumbers(true)}/>)}{counts.size === 0 && <p className="muted">メモに *キーワード を書くと、ここに集まります。</p>}</aside>;
}
