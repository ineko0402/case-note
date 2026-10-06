export type View = 'notes' | 'keywords' | 'board' | 'timeline';
type Props = {view: View; connectionMode: 'board' | 'timeline'; count: number; setView: (view: View) => void; setSelected: (word: string | null) => void; setLinkSource: (word: string | null) => void};
export function AppNavigation({view,connectionMode,count,setView,setSelected,setLinkSource}: Props) {
 return <nav aria-label="表示切り替え"><button aria-pressed={view === 'notes'} onClick={() => { setView('notes'); setSelected(null); setLinkSource(null); }}>メモ</button><button aria-pressed={view === 'keywords'} onClick={() => {setView('keywords'); setLinkSource(null);}}>キーワード <span>{count}</span></button><button aria-pressed={view === 'board' || view === 'timeline'} onClick={() => { setView(connectionMode); setLinkSource(null); }}>つながり</button></nav>;
}
