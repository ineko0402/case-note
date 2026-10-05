export type InputCandidate = { word: string; registered: boolean; ranges: {start: number; end: number}[] };

export function inputCandidates(text: string, registered: Set<string>): InputCandidate[] {
  const found = new Map<string, InputCandidate>();
  const explicit = [...text.matchAll(/(?:^|\s)\*[^\s*]+/gu)].map(match=>({start:match.index!,end:match.index!+match[0].length}));
  function add(word: string, start: number) {
    if(!word || /[\s*]/u.test(word) || explicit.some(range=>start<range.end && start+word.length>range.start)) return;
    const previous=found.get(word);
    const range={start,end:start+word.length};
    if(previous) { if(!previous.ranges.some(item=>item.start===start))previous.ranges.push(range); }
    else found.set(word,{word,registered:registered.has(word),ranges:[range]});
  }
  // Brackets are intentional delimiters; never consume them as part of a name.
  for(const match of text.matchAll(/\(([^()\s*]+)\)|（([^（）\s*]+)）|「([^「」\s*]+)」|『([^『』\s*]+)』|\[([^\[\]\s*]+)\]|【([^【】\s*]+)】/gu)){
    const word=match.slice(1).find(Boolean)!;
    add(word,match.index!+1);
  }
  if(/\s/u.test(text))for(const match of text.matchAll(/[^\s]+/gu)){
    const word=match[0];
    if(!/[。、!?！？()（）「」『』\[\]【】]/u.test(word))add(word,match.index!);
  }
  return [...found.values()];
}
