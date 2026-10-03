import { useState, type DragEvent } from 'react';
import { moveRelative } from './model';
export function useDragOrder(onMove: (group: string, from: string, to: string, after: boolean) => void) {
  const [drag, setDrag] = useState<{ group: string; id: string } | null>(null);
  const [target, setTarget] = useState<{ group: string; id: string; after: boolean } | null>(null);
  const clear = () => { setDrag(null); setTarget(null); };
  function locate(event: DragEvent<HTMLElement>, group: string, id: string) {
    if (!drag || drag.group !== group || drag.id === id) { setTarget(null); return null; }
    event.preventDefault(); event.dataTransfer.dropEffect = 'move';
    const rect = event.currentTarget.getBoundingClientRect();
    return { group, id, after: event.clientY > rect.top + rect.height / 2 };
  }
  return {
    clear,
    handle(group: string, id: string) {
      return { draggable: true, onDragStart: (event: DragEvent<HTMLElement>) => { event.stopPropagation(); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); setDrag({ group, id }); }, onDragEnd: clear };
    },
    row(group: string, id: string) {
      return { className: [drag?.group === group && drag.id === id ? 'dragging' : '', target?.group === group && target.id === id ? target.after ? 'drop-after' : 'drop-before' : ''].filter(Boolean).join(' '), onDragOver: (event: DragEvent<HTMLElement>) => setTarget(locate(event, group, id)), onDragLeave: (event: DragEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(null); }, onDrop: (event: DragEvent<HTMLElement>) => { const destination = locate(event, group, id); if (drag && destination) onMove(group, drag.id, id, destination.after); clear(); } };
    },
  };
}
export { moveRelative };
