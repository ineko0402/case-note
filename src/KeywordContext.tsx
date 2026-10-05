import type { Data } from './model';
import { keywords, personWords, changeKeywordCategory } from './model';
import { KeywordConnections, ConnectionPicker } from './KeywordConnections';
type Props = { data: Data; selected: string | null; editing: string | null; linkSource: string | null; keywordIds: string[]; setData: (data: Data) => void; selectKeyword: (word: string) => void; setRenaming: (value: boolean) => void; setMerging: (value: boolean) => void; setLinkSource: (value: string | null) => void; showKeywordList: boolean; setShowKeywordList: (value: boolean) => void; showBoardMemos: boolean; setShowBoardMemos: (value: boolean) => void; view: string };
export function KeywordContext({data, selected, editing, linkSource, keywordIds, setData, selectKeyword, setRenaming, setMerging, setLinkSource, showKeywordList, setShowKeywordList, showBoardMemos, setShowBoardMemos, view}: Props) {
 return <div className="context-header" aria-label="選択キーワードとつながり">
        {selected && <section className="selection keyword-operation-card" aria-label="選択中のキーワードの操作">
          <div className="selected-keyword-summary"><span className="keyword-kind">選択中のキーワード</span><h2>*{selected}</h2><span>{data.notes.filter(note=>keywords(note.text).some(word=>personWords(data,selected).includes(word))).length}件のメモ</span></div>
          <div className="keyword-actions"><h3>キーワードの操作</h3><div className="keyword-action-controls">
            <label>分類<select value={data.categories[selected] ?? '未分類'} onChange={event => setData(changeKeywordCategory(data, selected, event.target.value))}>{data.categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label>
            <button onClick={() => setRenaming(true)} disabled={editing !== null || !!linkSource}>名前を変更</button>
            <button disabled={editing !== null || !!linkSource} onClick={()=>setMerging(true)}>キーワードを統合</button>
          </div>{editing !== null ? <p className="muted keyword-action-help">名前変更・統合はメモの編集を完了してから行えます。</p> : linkSource && <p className="muted keyword-action-help">名前変更・統合はつなげる操作を終了してから行えます。</p>}</div>
        </section>}
        {linkSource && <ConnectionPicker source={linkSource} words={keywordIds} data={data} update={setData} close={() => setLinkSource(null)}/>}
        {selected && <KeywordConnections word={selected} data={data} update={setData} select={selectKeyword} begin={() => setLinkSource(selected)} isChoosing={!!linkSource}/>}
<div className="organize-switch"><button aria-expanded={showKeywordList} onClick={() => setShowKeywordList(!showKeywordList)}>{showKeywordList ? 'キーワード一覧を隠す' : 'キーワード一覧を表示'}</button>{view === 'board' && <button aria-pressed={showBoardMemos} onClick={() => setShowBoardMemos(!showBoardMemos)}>{showBoardMemos ? '関連メモを隠す' : '関連メモを表示'}</button>}</div></div>;
}
