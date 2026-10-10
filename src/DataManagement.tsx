import { useRef, useState } from 'react';
import { freshData, keywordCounts, validateData, type Data } from './model';
import './DataManagement.css';

function Counts({data}: {data: Data}) {
  return <dl className="data-counts"><div><dt>メモ</dt><dd>{data.notes.length}件</dd></div><div><dt>キーワード</dt><dd>{keywordCounts(data).size}個</dd></div><div><dt>つながり</dt><dd>{data.links.length}件</dd></div><div><dt>タイムライン</dt><dd>{Object.keys(data.timeline ?? {}).length}件</dd></div></dl>;
}
type Props = {
  data: Data; update: (update: (previous: Data) => Data) => void;
  backup: () => void; apply: (next: Data) => Promise<void>; close: () => void; busy: boolean;
};
export function DataManagement({data,update,backup,apply,close,busy}: Props) {
  const [mode,setMode] = useState<'home'|'restore'|'clear'>('home');
  const [imported,setImported] = useState<{data: Data; name: string} | null>(null);
  const [error,setError] = useState(''), [reading,setReading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  async function read(upload: File) {
    setError(''); setReading(true);
    try {
      const next = validateData(JSON.parse(await upload.text()));
      setImported({data:next,name:upload.name}); setMode('restore');
    } catch { setError('読み込めませんでした。Case NoteのJSONバックアップを選んでください。'); }
    finally { setReading(false); }
  }
  async function commit(next: Data) {
    setError('');
    try { await apply(next); close(); }
    catch { setError('保存できなかったため、現在のデータを保持しています。もう一度お試しください。'); }
  }
  const disabled = busy || reading;
  return <section className="category-settings data-management">
    <div className="list-heading"><h2>{mode==='clear'?'すべてのデータを消去':mode==='restore'?'バックアップから復元':'データ管理'}</h2><button disabled={disabled} onClick={close}>閉じる</button></div>
    {mode === 'home' ? <>
      <label className="game-title-field">ゲームタイトル<input type="text" value={data.gameTitle ?? ''} disabled={disabled} placeholder="例：消えた銀の鍵" onChange={event => {const gameTitle=event.target.value; update(previous => ({...previous,gameTitle}));}}/></label>
      <p className="game-title-help">タイトルは自動保存され、バックアップの内容とファイル名にも入ります。</p>
      <p>保存先：このブラウザ</p><p className="muted">端末間の自動同期はありません。ブラウザの保存データを削除すると、このメモも消えます。</p>
      <Counts data={data}/>
      <div className="data-actions"><button disabled={disabled} onClick={backup}>バックアップを保存</button><button disabled={disabled} onClick={()=>file.current?.click()}>バックアップから復元</button></div>
      <div className="data-danger"><p>次のゲームを始めるときは、データを消去して初期状態に戻せます。</p><button disabled={disabled} onClick={()=>{setMode('clear');setError('');}}>すべてのデータを消去</button></div>
    </> : <>
      <p>{mode==='clear'?'ゲームタイトル・メモ・キーワード・分類・つながり・タイムライン・下書きをすべて消去し、分類を初期状態に戻します。':'現在のデータを、ゲームタイトルを含めてバックアップの内容で置き換えます。追加ではありません。'}</p>
      <p className="muted">編集中の未保存の文章も破棄されます。実行前に現在のバックアップを保存できます。</p>
      <h3>現在のデータ</h3><p className="backup-game-title">{data.gameTitle?.trim() || 'タイトル未設定'}</p><Counts data={data}/>
      {mode==='restore' && imported && <><h3>復元するデータ</h3><p className="backup-game-title">{imported.data.gameTitle?.trim() || 'タイトル未設定'}</p><p className="backup-filename">{imported.name}</p><Counts data={imported.data}/></>}
      <button disabled={disabled} onClick={backup}>現在のバックアップを保存</button>
      <div className="actions"><button disabled={disabled} onClick={()=>{setMode('home');setImported(null);setError('');}}>キャンセル</button><button className={mode==='clear'?'danger-button':'primary'} disabled={disabled||(mode==='restore'&&!imported)} onClick={()=>void commit(mode==='clear'?freshData():imported!.data)}>{busy?'保存中…':mode==='clear'?'すべて消去する':'この内容で復元する'}</button></div>
    </>}
    {error && <p role="alert">{error}</p>}
    <input ref={file} hidden type="file" accept=".json,application/json" onChange={event=>{const upload=event.target.files?.[0];if(upload)void read(upload);event.target.value='';}}/>
  </section>;
}
