export type View = 'notes' | 'keywords' | 'board' | 'timeline';
type Props = {view: View; memoMode: 'notes' | 'timeline'; count: number; setView: (view: View) => void; setSelected: (word: string | null) => void; setLinkSource: (word: string | null) => void};
export function AppNavigation({view,memoMode,count,setView,setSelected,setLinkSource}: Props) {
 return <nav aria-label="表示切り替え"><button aria-pressed={view === 'notes' || view === 'timeline'} onClick={() => { setView(memoMode); setSelected(null); setLinkSource(null); }}>メモ</button><button aria-pressed={view === 'keywords'} onClick={() => setView('keywords')}>キーワード <span>{count}</span></button><button aria-pressed={view === 'board'} onClick={() => { setView('board'); setLinkSource(null); }}>つながり</button></nav>;
}
