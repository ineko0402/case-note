import { MemoDialog } from './MemoDialog';
import { keywordCounts, type Data } from './model';

export function QuickMemo({data,update,close}: {data: Data; update: (data: Data) => void; close: () => void}) {
  function add() {
    if (!data.draft.trim()) return;
    update({...data,draft:'',notes:[...data.notes,{id:crypto.randomUUID(),text:data.draft,createdAt:new Date().toISOString()}]});
    close();
  }
  return <MemoDialog title="新しいメモ" value={data.draft} onChange={draft=>update({...data,draft})} registered={new Set(keywordCounts(data).keys())} submitLabel="追加" submit={add} close={close}/>;
}
