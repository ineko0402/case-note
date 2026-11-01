import { personWords, type Data } from './model.ts';

/** Prefer the person's number, even when the stored row uses an alias. */
export function sortLocationPeople(data:Data,people:string[]):string[] {
  const number=(word:string)=>Math.min(...personWords(data,word).filter(item=>/^#?\d+$/u.test(item)).map(item=>Number(item.replace(/^#/,''))).filter(Number.isSafeInteger));
  return [...people].sort((a,b)=>{
    const av=number(a),bv=number(b);
    if(av!==bv)return av<bv?-1:1;
    if(Number.isFinite(av))return 0;
    return a.localeCompare(b,'ja',{numeric:true});
  });
}
export function orderedLocationPeople(data:Data,people:string[]):string[] {
  return data.locations?.manualPeopleOrder?[...people]:sortLocationPeople(data,people);
}
