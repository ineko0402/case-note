import { completeOrder, keywordCounts, keywords, type Data } from './model.ts';

export type ConnectionCandidate = { word: string; category: string; sharedNotes: number; status?: 'tentative' | 'confirmed' };
export type ConnectionOptions = {
  mode: 'list' | 'memo'; category: string | null; query: string;
  onlyShared: boolean; hideConnected: boolean; target: string | null;
  continueConnecting: boolean; feedback: string;
};
export function initialConnectionOptions(mode: ConnectionOptions['mode']): ConnectionOptions {
  return {mode, category: null, query: '', onlyShared: false, hideConnected: false, target: null, continueConnecting: true, feedback: ''};
}

export function connectionCandidates(data: Data, source: string): ConnectionCandidate[] {
  const shared = new Map<string, number>();
  for (const note of data.notes) {
    const words = new Set(keywords(note.text));
    if (!words.has(source)) continue;
    for (const word of words) shared.set(word, (shared.get(word) ?? 0) + 1);
  }
  return completeOrder(data.keywordOrder, [...keywordCounts(data).keys()])
    .filter(word => word !== source)
    .map(word => ({word, category: data.categories[word] ?? '未分類', sharedNotes: shared.get(word) ?? 0,
      status: data.links.find(link => (link.a === source && link.b === word) || (link.b === source && link.a === word))?.status}))
    .sort((a, b) => b.sharedNotes - a.sharedNotes);
}

export function filterConnectionCandidates(candidates: ConnectionCandidate[], options: Pick<ConnectionOptions, 'category' | 'query' | 'onlyShared' | 'hideConnected'>) {
  const query = options.query.trim().toLocaleLowerCase();
  return candidates.filter(item => (options.category === null || item.category === options.category)
    && item.word.toLocaleLowerCase().includes(query)
    && (!options.onlyShared || item.sharedNotes > 0)
    && (!options.hideConnected || !item.status));
}
