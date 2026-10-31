import type { View } from './AppNavigation';
import { Icon } from './Icon';
import { SearchField } from './SearchField';

type Props = {
  view: View;
  memoOrder: 'asc' | 'desc';
  setMemoOrder: (value: 'asc' | 'desc') => void;
  switchConnection: (view: 'board' | 'timeline') => void;
  showKeywords: boolean;
  toggleKeywords: () => void;
  connecting: boolean;
  openSettings: () => void;
  search: string;
  setSearch: (value: string) => void;
};

export function DesktopToolbar({view, memoOrder, setMemoOrder, switchConnection, showKeywords, toggleKeywords, connecting, openSettings, search, setSearch}: Props) {
  const memoView = view === 'notes';
  const visibilityLabel = `キーワードパネルを${showKeywords ? '隠す' : '表示する'}`;
  return <div className="desktop-toolbar" role="region" aria-label="表示の操作">
    <div className="view-controls">
      {memoView && <label>登録順<select aria-label="メモの登録順" value={memoOrder} onChange={event=>setMemoOrder(event.target.value as 'asc' | 'desc')}><option value="asc">古い順</option><option value="desc">新しい順</option></select></label>}
      {(view === 'board' || view === 'timeline') && <div className="memo-mode-switch" aria-label="つながりの表示方法"><button type="button" aria-pressed={view === 'board'} onClick={()=>switchConnection('board')}>関係</button><button type="button" aria-pressed={view === 'timeline'} onClick={()=>switchConnection('timeline')}>時系列</button></div>}
    </div>
    <div className="shared-controls">
      {!memoView && <><button type="button" className="keyword-visibility" title={visibilityLabel} aria-label={visibilityLabel} aria-expanded={showKeywords && !connecting} disabled={connecting} onClick={toggleKeywords}><Icon name={showKeywords ? 'visibility_off' : 'visibility'}/><span>キーワード</span></button><button type="button" aria-haspopup="dialog" onClick={openSettings}>分類設定</button></>}
      <SearchField label={memoView ? 'メモを検索' : 'キーワードを検索'} placeholder={memoView ? 'メモを検索' : 'キーワードを検索'} value={search} onChange={setSearch}/>
    </div>
  </div>;
}
