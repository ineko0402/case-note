import { useEffect, useRef, useState } from 'react';
import { noteTimes, setTimeline, type Data, type Note } from './model';
import './TimelineSetting.css';

type Props = { note: Note; data: Data; update: (data: Data) => void };

export function TimelineSetting({note, data, update}: Props) {
  const [open, setOpen] = useState(false);
  const enabled = Object.hasOwn(data.timeline ?? {}, note.id);
  const time = data.timeline?.[note.id] ?? '時刻不明';
  const label = enabled ? `タイムラインの設定：${time}` : 'タイムラインに追加';
  return <div className="timeline-setting">
    <button className={`timeline-clock${enabled ? ' is-enabled' : ''}`} type="button" aria-label={label} title={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      {/* Google Material Symbols: schedule (Outlined). See third-party/material-symbols.md. */}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false"><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/></svg>
    </button>
    {enabled && <span className="timeline-clock-time">{time}</span>}
    {open && <TimelineSettingDialog note={note} data={data} update={update} close={() => setOpen(false)}/>}
  </div>;
}

function TimelineSettingDialog({note, data, update, close}: Props & {close: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const outsidePress = useRef(false);
  const enabled = Object.hasOwn(data.timeline ?? {}, note.id);
  const candidates = noteTimes(data, note);
  const [time, setTime] = useState(enabled ? data.timeline?.[note.id] ?? '' : candidates.length === 1 ? candidates[0] : '');
  const title = enabled ? 'タイムラインの設定' : 'タイムラインに追加';

  useEffect(() => {
    const element = dialog.current!;
    const viewport = window.visualViewport;
    function resize() {
      element.style.setProperty('--timeline-vh', (viewport?.height ?? window.innerHeight) + 'px');
      element.style.setProperty('--timeline-vtop', (viewport?.offsetTop ?? 0) + 'px');
    }
    resize();
    element.showModal();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    window.addEventListener('resize', resize);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.removeEventListener('resize', resize);
      document.body.style.overflow = previous;
    };
  }, []);

  function outside(x: number, y: number) {
    const box = dialog.current!.getBoundingClientRect();
    return x < box.left || x > box.right || y < box.top || y > box.bottom;
  }
  return <dialog ref={dialog} className="settings-dialog timeline-setting-dialog" aria-label={title} onCancel={close}
    onPointerDown={event => {outsidePress.current = event.target === event.currentTarget && outside(event.clientX, event.clientY);}}
    onClick={event => {if (outsidePress.current && event.target === event.currentTarget && outside(event.clientX, event.clientY)) close(); outsidePress.current = false;}}>
    <form onSubmit={event => {event.preventDefault(); update(setTimeline(data, note.id, true, time || null)); close();}}>
      <h2 className="timeline-dialog-heading" tabIndex={-1} autoFocus>{title}</h2>
      <div className="timeline-dialog-body">
        <section aria-label="対象のメモ"><h3>対象のメモ</h3><p className="timeline-dialog-note">{note.text}</p></section>
        <label>基準時刻<input type="time" value={time} onChange={event => setTime(event.target.value)}/></label>
        {candidates.length > 1 && <p>複数の時刻があります。並べる基準を選んでください。</p>}
        <div className="time-candidates">{candidates.map(value => <button type="button" key={value} aria-pressed={time === value} onClick={() => setTime(value)}>{value}</button>)}<button type="button" aria-pressed={!time} onClick={() => setTime('')}>時刻不明</button></div>
        <p className="muted">{!time ? '時刻不明として末尾に表示します。' : 'この時刻を基準にタイムラインへ並べます。'}閉じると変更は反映されません。</p>
      </div>
      <div className="timeline-dialog-actions">
        {enabled && <button type="button" onClick={() => {update(setTimeline(data, note.id, false)); close();}}>タイムラインから外す</button>}
        <button type="button" onClick={close}>閉じる</button><button className="primary">{enabled ? '保存' : '追加'}</button>
      </div>
    </form>
  </dialog>;
}
