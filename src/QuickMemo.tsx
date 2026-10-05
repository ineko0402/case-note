import { useEffect, useRef } from 'react';
import { KeywordEditor } from './KeywordEditor';
import { keywordCounts, type Data } from './model';

export function QuickMemo({ data, update, close }: { data: Data; update: (data: Data) => void; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  function add() {
    if (!data.draft.trim()) return;
    update({ ...data, draft: '', notes: [...data.notes, { id: crypto.randomUUID(), text: data.draft, createdAt: new Date().toISOString() }] });
    close();
  }
  return <dialog ref={dialog} className="settings-dialog" aria-label="新しいメモ" onCancel={close}>
    <form onSubmit={event => { event.preventDefault(); add(); }}>
      <div className="list-heading"><h2>新しいメモ</h2><button type="button" onClick={close}>閉じる</button></div>
      <KeywordEditor label="新しいメモの本文" autoFocus value={data.draft} onChange={draft => update({ ...data, draft })} registered={new Set(keywordCounts(data).keys())} onSubmitShortcut={add}/>
      <p className="muted">閉じても下書きは残ります。追加後は元の画面に戻ります。</p>
      <div className="actions"><button type="button" onClick={close}>閉じる</button><button className="primary" disabled={!data.draft.trim()}>追加</button></div>
    </form>
  </dialog>;
}
