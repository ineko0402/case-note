import { useState } from 'react';
import { noteTimes, addTimelineNotes, type Data } from './model';
import { hasTimeKeyword } from './inputHelp';

export function TimelineBulk({data, update, close}: {data: Data; update: (data: Data) => void; close: () => void}) {
  const [includeUntimed, setIncludeUntimed] = useState(false);
  const candidates = data.notes.filter(note => !Object.hasOwn(data.timeline ?? {}, note.id) && (includeUntimed || hasTimeKeyword(data, note)));
  const [selected, setSelected] = useState<string[]>([]);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const visible = candidates.filter(note => note.text.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const hiddenSelected = selected.filter(id => !visible.some(note => note.id === id)).length;
  function initial(id: string) {
    const note = candidates.find(note => note.id === id)!;
    const options = noteTimes(data, note);
    return options.length === 1 ? options[0] : '';
  }
  function add() {
    update(addTimelineNotes(data, selected.map(id => ({id, time: (times[id] ?? initial(id)) || null}))));
    close();
  }
  return <section className="category-settings timeline-bulk">
    <div className="timeline-bulk-heading"><h2>タイムラインにまとめて追加</h2><p className="muted">登録済みのメモは除外しています。載せたいメモを選んでください。</p></div>
    <div className="timeline-bulk-body">
      <label className="timeline-bulk-option"><input type="checkbox" checked={includeUntimed} onChange={event => {setIncludeUntimed(event.target.checked); setSelected([]);}}/>時間なしのメモも候補に含める</label>
      <div className="timeline-bulk-search"><input type="search" aria-label="追加するメモを検索" placeholder="メモを検索" value={search} onChange={event => setSearch(event.target.value)}/>{search && <button onClick={() => setSearch('')}>検索を解除</button>}</div>
      <div className="timeline-bulk-tools"><button disabled={!visible.length} onClick={() => setSelected(previous => [...new Set([...previous, ...visible.map(note => note.id)])])}>表示中をすべて選択</button><button disabled={!selected.length} onClick={() => setSelected([])}>選択を解除</button><span>表示 {visible.length}件</span></div>
      <div className="timeline-bulk-list">{visible.map(note => {
        const checked = selected.includes(note.id);
        const options = noteTimes(data, note);
        const time = times[note.id] ?? initial(note.id);
        return <article key={note.id} className={checked ? 'selected-bulk-note' : undefined}>
          <label className="bulk-note"><input type="checkbox" checked={checked} onChange={event => setSelected(previous => event.target.checked ? [...previous, note.id] : previous.filter(id => id !== note.id))}/><span>{note.text}</span></label>
          {checked && <>
            <label className="bulk-time">基準時刻<input type="time" aria-label={`メモ${candidates.indexOf(note) + 1}の基準時刻`} value={time} onChange={event => setTimes(previous => ({...previous, [note.id]: event.target.value}))}/></label>
            <div className="time-candidates">{options.map(value => <button key={value} aria-pressed={time === value} onClick={() => setTimes(previous => ({...previous, [note.id]: value}))}>{value}</button>)}<button aria-pressed={!time} onClick={() => setTimes(previous => ({...previous, [note.id]: ''}))}>時刻不明</button></div>
            {options.length > 1 && !time && <p className="muted">複数の時刻があります。選ばなければ時刻不明で追加します。</p>}
          </>}
        </article>;
      })}</div>
      {!visible.length && <p className="muted">{candidates.length ? '検索に一致するメモはありません。検索を解除してください。' : includeUntimed ? '追加できる未登録メモはありません。' : '時間入りの未登録メモがありません。時間なしのメモも候補に含められます。'}</p>}
    </div>
    <div className="timeline-bulk-footer">
      <div><strong>{selected.length}件選択</strong>{hiddenSelected > 0 && <p role="status">うち{hiddenSelected}件は検索で隠れていますが、追加対象です。</p>}<p className="muted">基準時刻が空欄のメモは、時刻不明で末尾に表示します。</p></div>
      <div className="actions"><button onClick={close}>閉じる</button><button className="primary" disabled={!selected.length} onClick={add}>{selected.length}件を追加</button></div>
    </div>
  </section>;
}
