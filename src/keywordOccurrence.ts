import type { Data } from './model';
export type KeywordOccurrence = {noteId:string;start:number;text:string};
/** Remove only the clicked marker. Refuse stale text rather than guessing a position. */
export function unmarkKeyword(data:Data, word:string, occurrence:KeywordOccurrence):Data {
 const note=data.notes.find(note=>note.id === occurrence.noteId),start=occurrence.start;
 const token='*'+word;
 if(!note || note.text !== occurrence.text || !Number.isInteger(start) || start<0 || note.text.slice(start,start+token.length)!==token || (start>0 && !/\s/u.test(note.text[start-1])) || (start+token.length<note.text.length && !/\s/u.test(note.text[start+token.length])))throw new Error('本文が変わりました。キーワードを選び直してください。');
 return {...data,registeredWords:[...new Set([...(data.registeredWords??[]),word])],notes:data.notes.map(item=>item.id === note.id ? {...item,text:item.text.slice(0,start)+item.text.slice(start+1)} : item)};
}
