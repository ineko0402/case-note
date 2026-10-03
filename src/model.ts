export const categories = ['未分類', 'ナンバー', '人物', '場所', 'アイテム', '時間', 'その他'];
export type Note = { id: string; text: string; createdAt: string };
export type Data = { version: 2; notes: Note[]; categories: Record<string, string>; draft: string; categoryOrder: string[]; keywordOrder: string[]; collapsed: string[]; noteOrder: string[] };
export const emptyData: Data = { version: 2, notes: [], categories: {}, draft: '', categoryOrder: [...categories], keywordOrder: [], collapsed: [], noteOrder: [] };
export function keywords(text: string): string[] {
  return [...new Set([...text.matchAll(/(?:^|\s)\*([^\s*]+)/gu)].map(match => match[1]))];
}
export function selectionWords(text: string): string[] {
  return text.trim().split(/\s+/u).map(word => word.replace(/^\*+/, '')).filter(Boolean);
}
export function keywordize(text: string, start: number, end: number, merge: boolean): { text: string; caret: number } {
  // Include an existing marker even when only its word was selected.
  if (start > 0 && text[start - 1] === '*' && (start === 1 || /\s/u.test(text[start - 2]))) start--;
  const words = selectionWords(text.slice(start, end));
  if (!words.length || words.some(word => word.includes('*'))) throw new Error('キーワード内に * は使えません。');
  const content = (merge ? [words.join('')] : words).map(word => '*' + word).join(' ');
  const before = text.slice(0, start), after = text.slice(end);
  const prefix = before && !/\s$/u.test(before) ? ' ' : '';
  const suffix = after && !/^\s/u.test(after) ? ' ' : '';
  return { text: before + prefix + content + suffix + after, caret: before.length + prefix.length + content.length };
}
export function moveBefore<T>(items: T[], from: T, to: T): T[] {
  if (from === to) return items;
  const result = items.filter(item => item !== from);
  result.splice(result.indexOf(to), 0, from);
  return result;
}
export function validateData(value: unknown): Data {
  if (!value || typeof value !== 'object') throw new Error('バックアップの形式が違います。');
  const data = value as Data;
  if (((data.version as number) !== 1 && data.version !== 2) || !Array.isArray(data.notes) || typeof data.draft !== 'string' || !data.categories || typeof data.categories !== 'object' || Array.isArray(data.categories)) throw new Error('バックアップの形式が違います。');
  const ids = new Set<string>();
  for (const note of data.notes) {
    if (!note || typeof note.id !== 'string' || ids.has(note.id) || typeof note.text !== 'string' || typeof note.createdAt !== 'string' || !Number.isFinite(Date.parse(note.createdAt))) throw new Error('メモの形式が違います。');
    ids.add(note.id);
  }
  const legacy = (data.version as number) === 1;
  const order = legacy ? [...categories] : data.categoryOrder;
  const validList = (list: unknown): list is string[] => Array.isArray(list) && list.every(item => typeof item === 'string' && item.trim() === item && item.length > 0) && new Set(list).size === list.length;
  if (!validList(order) || order[0] !== '未分類' || Object.values(data.categories).some(category => !order.includes(category))) throw new Error('分類の形式が違います。');
  if (!legacy && (!validList(data.keywordOrder) || !validList(data.collapsed) || data.collapsed.some(category => !order.includes(category)))) throw new Error('並び順の形式が違います。');
  if (data.noteOrder !== undefined && !validList(data.noteOrder)) throw new Error('メモの並び順が違います。');
  return { version: 2, notes: data.notes, categories: Object.fromEntries(Object.entries(data.categories)), draft: data.draft, categoryOrder: order, keywordOrder: legacy ? [] : data.keywordOrder, collapsed: legacy ? [] : data.collapsed, noteOrder: data.noteOrder ?? [] };
}

export function moveRelative<T>(items: T[], from: T, to: T, after: boolean): T[] {
  if (from === to || !items.includes(from) || !items.includes(to)) return items;
  const result = items.filter(item => item !== from);
  result.splice(result.indexOf(to) + (after ? 1 : 0), 0, from);
  return result;
}
export function completeOrder(order: string[], ids: string[]): string[] {
  return [...order.filter(id => ids.includes(id)), ...ids.filter(id => !order.includes(id))];
}
