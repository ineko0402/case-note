import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSmallScreen } from './useSmallScreen';

// Render outside scrolling panels. Small screens use a native modal dialog.
export function ActionMenu({label, title, disabled = false, children}: {
  label: string; title: string; disabled?: boolean; children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const small = useSmallScreen();
  const id = useId();
  const close = () => setOpen(false);
  useLayoutEffect(() => {
    if (!open) return;
    const element = panel.current!;
    const viewport = window.visualViewport;
    if (small) element.showModal(); else element.show();
    function position() {
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      element.style.maxHeight = Math.max(80, height - 24) + 'px';
      element.style.width = Math.min(small ? 360 : 320, width - 24) + 'px';
      const box = trigger.current!.getBoundingClientRect();
      const panelHeight = element.getBoundingClientRect().height;
      element.style.left = (small ? left + (width - element.offsetWidth) / 2 : Math.max(left + 12, Math.min(box.right - element.offsetWidth, left + width - element.offsetWidth - 12))) + 'px';
      const y = small ? top + (height - panelHeight) / 2 : box.bottom + 6 + panelHeight <= top + height - 12 ? box.bottom + 6 : box.top - panelHeight - 6;
      element.style.top = Math.max(top + 12, Math.min(y, top + height - panelHeight - 12)) + 'px';
    }
    function outside(event: MouseEvent) {
      const box = element.getBoundingClientRect();
      const backdrop = event.target === element && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
      if (backdrop || (!element.contains(event.target as Node) && !trigger.current?.contains(event.target as Node))) setOpen(false);
    }
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') {event.preventDefault(); setOpen(false);} }
    position();
    element.querySelector<HTMLElement>('button,select')?.focus({preventScroll:true});
    const observer = new ResizeObserver(position); observer.observe(element);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    viewport?.addEventListener('resize', position);
    viewport?.addEventListener('scroll', position);
    document.addEventListener('click', outside);
    document.addEventListener('keydown', escape);
    return () => {
      observer.disconnect(); element.close();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      viewport?.removeEventListener('resize', position);
      viewport?.removeEventListener('scroll', position);
      document.removeEventListener('click', outside);
      document.removeEventListener('keydown', escape);
      trigger.current?.focus({preventScroll:true});
    };
  }, [open, small]);
  return <>
    <button type="button" ref={trigger} disabled={disabled} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={title} onClick={() => setOpen(!open)}>{label}</button>
    {open && createPortal(<dialog ref={panel} id={id} className="action-menu" aria-label={title} onCancel={event => {event.preventDefault(); close();}}>
      <div className="action-menu-heading"><strong>{title}</strong><button type="button" onClick={close} aria-label="操作を閉じる">閉じる</button></div>
      <div className="action-menu-body">{children(close)}</div>
    </dialog>, document.body)}
  </>;
}
