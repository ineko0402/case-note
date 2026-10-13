import { useEffect, useState } from 'react';

export function TimelineReference({value,onChange,label='並べる基準',preferSequence=false}: {value:string;onChange:(value:string)=>void;label?:string;preferSequence?:boolean}) {
 const [sequence,setSequence] = useState(value ? /^\d{1,2}$/u.test(value) : preferSequence);
 useEffect(()=>{if(value)setSequence(!value.includes(':'));},[value]);
 return <fieldset className="timeline-reference"><legend>{label}</legend><div className="reference-kind"><button type="button" aria-pressed={!sequence} onClick={()=>{setSequence(false);onChange('');}}>時刻</button><button type="button" aria-pressed={sequence} onClick={()=>{setSequence(true);onChange('');}}>時系列番号</button></div><label>{sequence?'時系列番号（0〜99）':'基準時刻'}<input aria-label={sequence?label+'・時系列番号':label+'・時刻'} type={sequence?'text':'time'} inputMode={sequence?'numeric':undefined} pattern={sequence?'[0-9]{1,2}':undefined} placeholder={sequence?'例：01':undefined} value={value} onChange={event=>onChange(event.target.value)}/></label></fieldset>;
}
