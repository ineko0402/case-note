export const categories = ['未分類', 'ナンバー', '人物', '場所', 'アイテム', '時間', 'その他'];
export type Note = { id: string; text: string; createdAt: string };
export type Link = { id: string; a: string; b: string; status: 'tentative' | 'confirmed' };
export type Group = { id: string; name: string; category: string; members: string[]; collapsed: boolean };
export type BoardCard = { word: string; x: number; y: number };
export type Board = { cards: BoardCard[]; viewport: { x: number; y: number; zoom: number } };
export type Data = { timeline?: Record<string, string | null>; registeredWords?: string[]; version: 4; notes: Note[]; categories: Record<string, string>; draft: string; categoryOrder: string[]; keywordOrder: string[]; collapsed: string[]; noteOrder: string[]; links: Link[]; groups: Group[]; board: Board };
export const emptyData: Data = { version: 4, notes: [], categories: {}, draft: '', categoryOrder: [...categories], keywordOrder: [], collapsed: [], noteOrder: [], links: [], groups: [], board: { cards: [], viewport: { x: 0, y: 0, zoom: 1 } } };
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
  if (((data.version as number) !== 1 && (data.version as number) !== 2 && (data.version as number) !== 3 && data.version !== 4) || !Array.isArray(data.notes) || typeof data.draft !== 'string' || !data.categories || typeof data.categories !== 'object' || Array.isArray(data.categories)) throw new Error('バックアップの形式が違います。');
  const ids = new Set<string>();
  for (const note of data.notes) {
    if (!note || typeof note.id !== 'string' || ids.has(note.id) || typeof note.text !== 'string' || typeof note.createdAt !== 'string' || !Number.isFinite(Date.parse(note.createdAt))) throw new Error('メモの形式が違います。');
    ids.add(note.id);
  }
  if (data.timeline !== undefined && (!data.timeline || typeof data.timeline !== 'object' || Array.isArray(data.timeline) || Object.entries(data.timeline).some(([id, time]) => !ids.has(id) || (time !== null && (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(time)))))) throw new Error('タイムラインの形式が違います。');
  const legacy = (data.version as number) === 1;
  const order = legacy ? [...categories] : data.categoryOrder;
  const validList = (list: unknown): list is string[] => Array.isArray(list) && list.every(item => typeof item === 'string' && item.trim() === item && item.length > 0) && new Set(list).size === list.length;
  if (!validList(order) || order[0] !== '未分類' || Object.values(data.categories).some(category => !order.includes(category))) throw new Error('分類の形式が違います。');
  if (!legacy && (!validList(data.keywordOrder) || !validList(data.collapsed) || data.collapsed.some(category => !order.includes(category)))) throw new Error('並び順の形式が違います。');
  if (data.noteOrder !== undefined && !validList(data.noteOrder)) throw new Error('メモの並び順が違います。');
  if (data.registeredWords !== undefined && (!validList(data.registeredWords) || data.registeredWords.some(word => /[\s*]/u.test(word)))) throw new Error('登録キーワードの形式が違います。');
  const links = (data.version as number) >= 3 ? data.links : [];
  const groups = (data.version as number) >= 3 ? data.groups : [];
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
  const board = data.version === 4 ? data.board : { cards: [], viewport: { x: 0, y: 0, zoom: 1 } };
  if (!board || !Array.isArray(board.cards) || !board.viewport || !Number.isFinite(board.viewport.x) || !Number.isFinite(board.viewport.y) || !Number.isFinite(board.viewport.zoom) || board.viewport.zoom < 0.1 || board.viewport.zoom > 2) throw new Error('関係図の形式が違います。');
  const boardWords = new Set<string>();
  for (const card of board.cards) {
    if (!card || typeof card.word !== 'string' || !card.word || /[\s*]/u.test(card.word) || boardWords.has(card.word) || !Number.isFinite(card.x) || !Number.isFinite(card.y)) throw new Error('カードの形式が違います。');
    boardWords.add(card.word);
  }
  return { ...(data.timeline !== undefined ? { timeline: data.timeline } : {}), ...(data.registeredWords !== undefined ? { registeredWords: data.registeredWords } : {}), version: 4, notes: data.notes, categories: Object.fromEntries(Object.entries(data.categories)), draft: data.draft, categoryOrder: order, keywordOrder: legacy ? [] : data.keywordOrder, collapsed: legacy ? [] : data.collapsed, noteOrder: data.noteOrder ?? [], links, groups, board };
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

export function placeCard(data: Data, word: string, x: number, y: number): Data {
  if (data.board.cards.some(card => card.word === word)) return data;
  return { ...data, board: { ...data.board, cards: [...data.board.cards, { word, x, y }] } };
}
export function removeCard(data: Data, word: string): Data {
  return { ...data, board: { ...data.board, cards: data.board.cards.filter(card => card.word !== word) } };
}

export function classifyUnassigned(data: Data, words: string[], category: string): Data {
  if (category === '未分類' || !data.categoryOrder.includes(category)) return data;
  return [...new Set(words)].reduce((next, word) => (next.categories[word] ?? '未分類') === '未分類' ? changeKeywordCategory(next, word, category) : next, data);
}

export function contextWords(data: Data, word: string | null): Set<string> | null {
  if (!word) return null;
  const result = new Set([word]);
  data.notes.filter(note => keywords(note.text).includes(word)).forEach(note => keywords(note.text).forEach(item => result.add(item)));
  data.links.filter(link => link.a === word || link.b === word).forEach(link => { result.add(link.a); result.add(link.b); });
  return result;
}

/** Replace only complete explicit keyword tokens; ordinary prose stays unchanged. */
export function replaceKeyword(text: string, word: string, next: string): string {
  return text.replace(/(^|\s)\*([^\s*]+)/gu, (token, prefix: string, found: string) => found === word ? prefix + '*' + next : token);
}
export function renameKeyword(data: Data, word: string, next: string): Data {
  if (!next || /[\s*]/u.test(next)) throw new Error('名前に空白や * は使えません。');
  if (next === word) throw new Error('新しい名前を入力してください。');
  const registered = new Set([...data.notes.flatMap(note => keywords(note.text)), ...keywords(data.draft), ...(data.registeredWords ?? []), ...Object.keys(data.categories), ...data.keywordOrder, ...data.links.flatMap(link => [link.a, link.b]), ...data.groups.flatMap(group => group.members), ...data.board.cards.map(card => card.word)]);
  if (registered.has(next)) throw new Error('登録済みの名前です。別の名前を入力してください。');
  if (!registered.has(word)) throw new Error('変更するキーワードが見つかりません。');
  return { ...data,
    ...(data.registeredWords ? { registeredWords: data.registeredWords.map(item => item === word ? next : item) } : {}),
    notes: data.notes.map(note => ({ ...note, text: replaceKeyword(note.text, word, next) })),
    draft: replaceKeyword(data.draft, word, next),
    categories: Object.fromEntries(Object.entries(data.categories).map(([key, category]) => [key === word ? next : key, category])),
    keywordOrder: data.keywordOrder.map(item => item === word ? next : item),
    links: data.links.map(link => ({ ...link, a: link.a === word ? next : link.a, b: link.b === word ? next : link.b })),
    groups: data.groups.map(group => ({ ...group, members: group.members.map(item => item === word ? next : item) })),
    board: { ...data.board, cards: data.board.cards.map(card => card.word === word ? { ...card, word: next } : card) }
  };
}

export function keywordCounts(data: Data): Map<string, number> {
  const counts = new Map((data.registeredWords ?? []).map(word => [word, 0]));
  data.notes.forEach(note => keywords(note.text).forEach(word => counts.set(word, (counts.get(word) ?? 0) + 1)));
  return counts;
}
export function categorySortValue(word: string, category: string): number {
  if (category === 'ナンバー' && /^\d+$/u.test(word) && Number.isSafeInteger(Number(word))) return Number(word);
  if (category === '時間') {
    const match = /^(\d{2}):?(\d{2})$/u.exec(word);
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) return Number(match[1]) * 60 + Number(match[2]);
  }
  return Infinity;
}
export function sortCategory(data: Data, category: string): Data {
  if (!['時間', 'ナンバー'].includes(category)) return data;
  const order = completeOrder(data.keywordOrder, [...keywordCounts(data).keys()]);
  const members = order.filter(word => (data.categories[word] ?? '未分類') === category);
  members.sort((a, b) => { const av = categorySortValue(a, category), bv = categorySortValue(b, category); return av === bv ? 0 : av < bv ? -1 : 1; });
  let i = 0;
  return { ...data, keywordOrder: order.map(word => (data.categories[word] ?? '未分類') === category ? members[i++] : word) };
}
export function numberCandidates(data: Data, start: number, end: number): { added: string[]; skipped: number } {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end - start >= 1000) throw new Error('0以上の整数で、開始から終了まで1000個以内を指定してください。');
  const existing = new Set([...keywordCounts(data).keys(), ...keywords(data.draft), ...Object.keys(data.categories), ...data.keywordOrder, ...data.links.flatMap(link => [link.a, link.b]), ...data.groups.flatMap(group => group.members), ...data.board.cards.map(card => card.word)]);
  const range = Array.from({length: end - start + 1}, (_, i) => String(start + i));
  return { added: range.filter(word => !existing.has(word)), skipped: range.filter(word => existing.has(word)).length };
}
export function addNumbers(data: Data, start: number, end: number): Data {
  if (!data.categoryOrder.includes('ナンバー')) throw new Error('分類「ナンバー」を分類設定で追加してください。');
  const { added } = numberCandidates(data, start, end);
  return { ...data, registeredWords: [...(data.registeredWords ?? []), ...added], categories: {...data.categories, ...Object.fromEntries(added.map(word => [word, 'ナンバー']))} };
}

export function noteTimes(data: Data, note: Note): string[] {
 return [...new Set(keywords(note.text).filter(word => data.categories[word] === '時間').map(word => categorySortValue(word, '時間')).filter(Number.isFinite).map(value => String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0')))];
}
export function setTimeline(data: Data, id: string, enabled: boolean, time?: string | null): Data {
 const note = data.notes.find(note => note.id === id); if (!note) return data;
 const timeline = { ...data.timeline };
 if (!enabled) delete timeline[id];
 else { const candidates = noteTimes(data, note); const next = time === undefined ? candidates.length === 1 ? candidates[0] : null : time;
 if (next !== null && !/^(?:[01]\d|2[0-3]):[0-5]\d$/u.test(next)) throw new Error('時刻をHH:MM形式で指定してください。'); Object.defineProperty(timeline, id, { value: next, enumerable: true, configurable: true, writable: true }); }
 return { ...data, timeline };
}
export function timelineNotes(data: Data): Note[] {
 const ids = completeOrder(data.noteOrder, data.notes.map(note => note.id));
 return ids.map(id => data.notes.find(note => note.id === id)!).filter(note => Object.hasOwn(data.timeline ?? {}, note.id)).sort((a,b) => {
 const av=data.timeline?.[a.id] ?? '99:99', bv=data.timeline?.[b.id] ?? '99:99';return av < bv ? -1 : av > bv ? 1 : 0;
 });
}
