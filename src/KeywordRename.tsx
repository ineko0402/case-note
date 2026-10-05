import { useState } from 'react';
import { keywords, renameKeyword, type Data } from './model';
export function KeywordRename({ word, data, apply, close }: { word: string; data: Data; apply: (next: Data, name: string) => void; close: () => void }) {
  const [name, setName] = useState(word);
  const [error, setError] = useState('');
  const count = data.notes.filter(note => keywords(note.text).includes(word)).length;
  return <form className="category-settings" onSubmit={event => {
    event.preventDefault();
    try { const next = renameKeyword(data, word, name); apply(next, name); close(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : '名前を変更できません。'); }
  }}><div className="list-heading"><h2>キーワードの名前を変更</h2></div><p>*{word} → 新しい名前</p><label className="rename-field">新しい名前<input autoFocus value={name} onChange={event => { setName(event.target.value); setError(''); }}/></label><p>{count}件のメモ内のキーワードを更新します。分類・つながり・並び順は引き継ぎます。</p><p className="muted">普通の文章は変更しません。名前に空白や * は使えません。登録済みの名前にまとめる場合は「キーワードを統合」を使ってください。</p>{error && <p role="alert">{error}</p>}<div className="actions"><button type="button" onClick={close}>閉じる</button><button className="primary" disabled={name === word || !name.trim()}>名前を変更</button></div></form>;
}
