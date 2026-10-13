import { MemoDialog } from './MemoDialog';
import { keywordCounts, applyKeywordClassification, type Data } from './model';

export function QuickMemo({data,update,close}: {data: Data; update: (data: Data) => void; close: () => void}) {
  function add() {
    if (!data.draft.trim()) return;
    update({...data,draft:'',draftTitle:'',notes:[...data.notes,{id:crypto.randomUUID(),title:(data.draftTitle ?? '').trim(),text:data.draft,createdAt:new Date().toISOString()}]});
    close();
  }
  return <MemoDialog title="新しいメモ" memoTitle={data.draftTitle ?? ''} onTitleChange={draftTitle=>update({...data,draftTitle})} value={data.draft} onChange={(draft,classification)=>update({...applyKeywordClassification(data,classification),draft})} registered={new Set(keywordCounts(data).keys())} submitLabel="追加" submit={add} close={close}/>;
}
