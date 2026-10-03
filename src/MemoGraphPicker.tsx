import { useState } from 'react';
import { keywords, type Note } from './model';
export function MemoGraphPicker({note,apply,close}: {note: Note; apply: (words: string[]) => void; close: () => void}) {
 const words=keywords(note.text), [selected,setSelected]=useState(words);
 return <section className="category-settings"><div className="list-heading"><h2>メモのキーワードを図に追加</h2><button onClick={close}>閉じる</button></div><p className="note-body">{note.text}</p><p className="muted">全部追加するか、図に置くキーワードを選んでください。</p><div className="actions"><button onClick={()=>setSelected(words)}>すべて選択</button><button onClick={()=>setSelected([])}>選択をクリア</button></div><div className="batch-picker">{words.map(word=><button key={word} className="batch-chip" aria-pressed={selected.includes(word)} onClick={()=>setSelected(previous=>previous.includes(word)?previous.filter(item=>item!==word):[...previous,word])}>*{word}</button>)}</div><div className="actions"><button onClick={close}>キャンセル</button><button className="primary" disabled={!selected.length} onClick={()=>apply(selected)}>{selected.length}個を図に追加</button></div></section>;
}
