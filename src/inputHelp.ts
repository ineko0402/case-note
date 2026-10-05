import { keywords, type Data, type Note } from './model';

export function hasTimeKeyword(data: Data, note: Note): boolean {
  return keywords(note.text).some(word => data.categories[word] === '時間');
}

export function keywordSuggestions(text: string, registered: Set<string>) {
  const words = [...registered].filter(word => word && !/[\s*]/u.test(word)).sort((a,b) => b.length-a.length);
  const found = new Map<string, { word: string; start: number; end: number }>();
  const tokens = [...text.matchAll(/(?:^|\s)\*[^\s*]+/gu)].map(match => ({start: match.index!, end: match.index!+match[0].length}));
  for (let start=0;start<text.length;) {
    const token=tokens.find(token=>start>=token.start && start<token.end);
    if(token){start=token.end;continue;}
    const word=words.find(word=>text.startsWith(word,start) && !tokens.some(token=>start<token.end && start+word.length>token.start));
    if(word){if(!found.has(word))found.set(word,{word,start,end:start+word.length});start+=word.length;}
    else start++;
  }
  return [...found.values()].slice(0,8);
}
