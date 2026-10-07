import { KeywordEditor } from './KeywordEditor';
import { MemoDialog } from './MemoDialog';
import type { MemoEditing } from './useMemoEditing';

export function MemoEditForm({ editor, registered, preserveTime = false, modal = false }: {
  editor: MemoEditing; registered: Set<string>; preserveTime?: boolean; modal?: boolean;
}) {
  if (modal) return <MemoDialog title="メモを編集" value={editor.text} onChange={editor.change}
    registered={registered} submitLabel="保存" submit={editor.save} close={editor.close}/>;
  return <form onSubmit={event => { event.preventDefault(); editor.save(); }}>
    <KeywordEditor label="メモを編集" autoFocus value={editor.text} onChange={editor.change}
      registered={registered} onSubmitShortcut={editor.save}/>
    {preserveTime && <p className="muted">基準時刻は維持されます。変更する場合は保存後に設定してください。</p>}
    <div className="actions">
      <button type="button" onClick={editor.close}>閉じる</button>
      <button className="primary" disabled={!editor.text.trim()}>保存</button>
    </div>
  </form>;
}
