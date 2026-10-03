export const categories = ['未分類', 'ナンバー', '人物', '場所', 'アイテム', '時間', 'その他'] as const;
export type Category = typeof categories[number];
export type Note = { id: string; text: string; createdAt: string };
export type Data = { version: 1; notes: Note[]; categories: Record<string, Category>; draft: string };
export const emptyData: Data = { version: 1, notes: [], categories: {}, draft: '' };
// A keyword starts at a line/whitespace boundary and ends at the next whitespace.
export function keywords(text: string): string[] {
  return [...new Set([...text.matchAll(/(?:^|\s)\*([^\s*]+)/gu)].map(match => match[1]))];
}
export function validateData(value: unknown): Data {
  if (!value || typeof value !== 'object') throw new Error('バックアップの形式が違います。');
  const data = value as Data;
  if (data.version !== 1 || !Array.isArray(data.notes) || typeof data.draft !== 'string' || !data.categories || typeof data.categories !== 'object' || Array.isArray(data.categories)) throw new Error('バックアップの形式が違います。');
  const ids = new Set<string>();
  for (const note of data.notes) {
    if (!note || typeof note.id !== 'string' || ids.has(note.id) || typeof note.text !== 'string' || typeof note.createdAt !== 'string' || !Number.isFinite(Date.parse(note.createdAt))) throw new Error('メモの形式が違います。');
    ids.add(note.id);
  }
  if (Object.values(data.categories).some(category => !categories.includes(category))) throw new Error('分類の形式が違います。');
  return data;
}
