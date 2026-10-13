import { keywords, type KeywordClassification } from './model.ts';

export type NumericCandidate = {text:string;number:string;person:boolean;start:number;end:number};
export function numericWord(text: string): {number:string;person:boolean} | null {
 const match = /^(#|＃|№|No\.\s*)?(\d{1,2})$/u.exec(text);
 return match ? {number:match[2],person:!!match[1]} : null;
}
export function numericCandidates(text:string): NumericCandidate[] {
 const explicit = [...text.matchAll(/(?:^|\s)\*[^\s*]+/gu)].map(match=>({start:match.index!,end:match.index!+match[0].length}));
 const clocks = [...text.matchAll(/\d{1,2}:\d{2}/gu)].map(match=>({start:match.index!,end:match.index!+match[0].length}));
 return [...text.matchAll(/(?<![A-Za-z0-9_#＃№*-])(?:(?:[#＃№]|No\.\s*)\d{1,2}|\d{1,2})(?![A-Za-z0-9_-])/gu)]
  .filter(match=>![...explicit,...clocks].some(range=>match.index!<range.end && match.index!+match[0].length>range.start))
  .map(match=>({text:match[0],...numericWord(match[0])!,start:match.index!,end:match.index!+match[0].length}));
}
export function applyNumericCandidate(text:string,candidate:NumericCandidate,kind:'sequence'|'person') {
 if(text.slice(candidate.start,candidate.end)!==candidate.text)throw new Error('本文が変わりました。候補を選び直してください。');
 if ([...text.matchAll(/(?:^|\s)\*[^\s*]+/gu)].some(match=>candidate.start < match.index!+match[0].length && candidate.end > match.index!)) throw new Error('キーワード化済みです。変更する場合は名前変更・分類の操作を使ってください。');
 const word = kind === 'person' ? '#'+candidate.number : candidate.number;
 const before=text.slice(0,candidate.start),after=text.slice(candidate.end);
 const prefix=before && !/\s$/u.test(before)?' ':'';
 const suffix=after && !/^\s/u.test(after)?' ':'';
 const next=before+prefix+'*'+word+suffix+after;
 const classification:KeywordClassification={word,category:kind==='person'?'ナンバー':'時間'};
 return {text:next,classification,caret:before.length+prefix.length+word.length+1};
}
export function usedClassifications(text:string, classifications:KeywordClassification[]) {
 const words=new Set(keywords(text));
 return classifications.filter(item=>words.has(item.word));
}
