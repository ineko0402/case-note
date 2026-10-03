export const categories = ['未分類', 'ナンバー', '人物', '場所', 'アイテム', '時間', 'その他'];
export type Note = { id: string; text: string; createdAt: string };
export type Link = { id: string; a: string; b: string; status: 'tentative' | 'confirmed' };
export type Group = { id: string; name: string; category: string; members: string[]; collapsed: boolean };
export type Data = { version: 3; notes: Note[]; categories: Record<string, string>; draft: string; categoryOrder: string[]; keywordOrder: string[]; collapsed: string[]; noteOrder: string[]; links: Link[]; groups: Group[] };
export const emptyData: Data = { version: 3, notes: [], categories: {}, draft: '', categoryOrder: [...categories], keywordOrder: [], collapsed: [], noteOrder: [], links: [], groups: [] };
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
  if (((data.version as number) !== 1 && (data.version as number) !== 2 && data.version !== 3) || !Array.isArray(data.notes) || typeof data.draft !== 'string' || !data.categories || typeof data.categories !== 'object' || Array.isArray(data.categories)) throw new Error('バックアップの形式が違います。');
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
  const links = data.version === 3 ? data.links : [];
  const groups = data.version === 3 ? data.groups : [];
  if (!Array.isArray(links) || !Array.isArray(groups)) throw new Error('結び・まとまりの形式が違います。');
  const linkIds = new Set<string>(), pairs = new Set<string>(), groupIds = new Set<string>(), names = new Set<string>();
  for (const link of links) {
    if (!link || typeof link.id !== 'string' || !link.id || linkIds.has(link.id) || typeof link.a !== 'string' || typeof link.b !== 'string' || !link.a || !link.b || /[\s*]/u.test(link.a + link.b) || link.a === link.b || !['tentative', 'confirmed'].includes(link.status)) throw new Error('結びの形式が違います。');
    const pair = JSON.stringify([link.a, link.b].sort());
    if (pairs.has(pair)) throw new Error('結びが重複しています。');
    pairs.add(pair); linkIds.add(link.id);
  }
  for (const group of groups) {
    if (!group || typeof group.id !== 'string' || !group.id || groupIds.has(group.id) || typeof group.name !== 'string' || !group.name.trim() || group.name !== group.name.trim() || !order.includes(group.category) || !validList(group.members) || typeof group.collapsed !== 'boolean' || group.members.some(word => /[\s*]/u.test(word) || (data.categories[word] ?? '未分類') !== group.category)) throw new Error('まとまりの形式が違います。');
    const name = JSON.stringify([group.category, group.name]);
    if (names.has(name)) throw new Error('まとまりの名前が重複しています。');
    names.add(name); groupIds.add(group.id);
  }
  return { version: 3, notes: data.notes, categories: Object.fromEntries(Object.entries(data.categories)), draft: data.draft, categoryOrder: order, keywordOrder: legacy ? [] : data.keywordOrder, collapsed: legacy ? [] : data.collapsed, noteOrder: data.noteOrder ?? [], links, groups };
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

export function connect(data: Data, a: string, b: string, id: string): Data {
  if (a === b || !a || !b || data.links.some(link => (link.a === a && link.b === b) || (link.a === b && link.b === a))) return data;
  return { ...data, links: [...data.links, { id, a, b, status: 'tentative' }] };
}
export function changeKeywordCategory(data: Data, word: string, category: string): Data {
  if (!data.categoryOrder.includes(category)) return data;
  return { ...data, categories: { ...data.categories, [word]: category }, groups: data.groups.map(group => ({ ...group, members: group.category === category ? group.members : group.members.filter(member => member !== word) })) };
}
export function renameCategory(data: Data, category: string, next: string): Data {
  return { ...data, categoryOrder: data.categoryOrder.map(item => item === category ? next : item), collapsed: data.collapsed.map(item => item === category ? next : item), categories: Object.fromEntries(Object.entries(data.categories).map(([word, item]) => [word, item === category ? next : item])), groups: data.groups.map(group => group.category === category ? { ...group, category: next } : group) };
}
export function deleteCategory(data: Data, category: string): Data {
  return { ...data, categoryOrder: data.categoryOrder.filter(item => item !== category), collapsed: data.collapsed.filter(item => item !== category), categories: Object.fromEntries(Object.entries(data.categories).map(([word, item]) => [word, item === category ? '未分類' : item])), groups: data.groups.filter(group => group.category !== category) };
}
