type Rect = {left:number;right:number;top:number;bottom:number};
type Viewport = {left:number;top:number;width:number;height:number};
export function floatingPanelPosition(anchor: Rect, viewport: Viewport, width: number, height: number) {
  const left = Math.max(viewport.left + 12, Math.min(anchor.left, viewport.left + viewport.width - width - 12));
  const below = anchor.bottom + 6;
  const top = below + height <= viewport.top + viewport.height - 12 ? below : anchor.top - height - 6;
  return {left,top:Math.max(viewport.top + 12,Math.min(top,viewport.top + viewport.height - height - 12))};
}
