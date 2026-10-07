import { Icon } from './Icon';
import './Icon.css';
import { useEffect, useRef, useState } from 'react';
import { noteTimes, setTimeline, type Data, type Note } from './model';
import './TimelineSetting.css';

type Props = { note: Note; data: Data; update: (data: Data) => void };

export function TimelineSetting({note, data, update, showTime = true, disabled = false, labelled = false}: Props & {showTime?: boolean; disabled?: boolean; labelled?: boolean}) {
  const [open, setOpen] = useState(false);
  const enabled = Object.hasOwn(data.timeline ?? {}, note.id);
  const time = data.timeline?.[note.id] ?? '時刻不明';
  const label = enabled ? `タイムラインの設定：${time}` : 'タイムラインに追加';
  return <div className="timeline-setting">
    <button className={`timeline-clock${enabled ? ' is-enabled' : ''}`} type="button" disabled={disabled} aria-label={label} title={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
      <Icon name="schedule"/>{labelled && '時刻設定'}
    </button>
    {enabled && showTime && <span className="timeline-clock-time">{time}</span>}
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
