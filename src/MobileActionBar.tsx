import { ActionMenu } from './ActionMenu';
import { Icon } from './Icon';
import { TimelineSetting } from './TimelineSetting';
import { changeKeywordCategory, type Data, type Note } from './model';
import './MobileActionBar.css';

export type MobileTarget = { kind: 'keyword' } | { kind: 'memo'; id: string } | null;
type Props = {
  word: string | null; note: Note | undefined; data: Data; update: (data: Data) => void;
  close: () => void; edit: () => void; remove: () => void;
  move?: (direction: -1 | 1) => void; canUp: boolean; canDown: boolean;
  connect: (mode: 'list' | 'memo') => void; rename: () => void; merge: () => void;
};
export function MobileActionBar({word,note,data,update,close,edit,remove,move,canUp,canDown,connect,rename,merge}: Props) {
  return <section className="mobile-action-bar" aria-label={word ? 'キーワードの操作' : 'メモの操作'}>
    <div className="mobile-action-bar-heading"><span>{word ? <>キーワード <strong>*{word}</strong></> : <>メモ <strong>{note?.text.replace(/\s+/g,' ').slice(0,40)}</strong></>}</span><button type="button" className="icon-button" aria-label="操作を閉じる" onClick={close}><Icon name="close"/></button></div>
    <div className="mobile-action-bar-tools">{word ? <>
      <ActionMenu label="つなげる" title={`*${word}からつなげる`}>{done => <><button type="button" onClick={() => {done();connect('list');}}>一覧から選ぶ</button><button type="button" onClick={() => {done();connect('memo');}}>メモから選ぶ</button></>}</ActionMenu>
      <ActionMenu label="分類" title={`*${word}の分類`}>{() => <label>分類<select value={data.categories[word] ?? '未分類'} onChange={event => update(changeKeywordCategory(data,word,event.target.value))}>{data.categoryOrder.map(category => <option key={category}>{category}</option>)}</select></label>}</ActionMenu>
      <ActionMenu label="その他" title={`*${word}のその他の操作`}>{done => <><button type="button" onClick={() => {done();rename();}}>名前を変更</button><button type="button" onClick={() => {done();merge();}}>キーワードを統合</button></>}</ActionMenu>
    </> : note && <>
      <button type="button" className="icon-label" onClick={edit}><Icon name="edit"/>編集</button>
      <TimelineSetting note={note} data={data} update={update} showTime={false} labelled/>
      <ActionMenu label="その他" title="メモのその他の操作">{done => <>{move && <><button type="button" disabled={!canUp} onClick={() => {done();move(-1);}}>上へ移動</button><button type="button" disabled={!canDown} onClick={() => {done();move(1);}}>下へ移動</button></>}<button type="button" onClick={() => {if(window.confirm('このメモを削除しますか？')){done();remove();}}}>メモを削除</button></>}</ActionMenu>
    </>}</div>
  </section>;
}
