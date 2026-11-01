import { orderedLocationPeople } from './locationPeople';
import { useEffect, useRef, useState } from 'react';
import type { Data } from './model';
import { emptyLocations, type Locations } from './locations';
import { addLocationAxes, locationPersonCandidates, locationTimeKeywords, timeLabelLines, timeLabelRange } from './locationAxes';
import { LocationGrid } from './LocationGrid';
import './LocationAxisSetup.css';

type Props={data:Data;update:(data:Data)=>void;close:()=>void};
export function LocationAxisSetup({data,update,close}:Props) {
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const element=dialog.current!;element.showModal();return ()=>element.close();},[]);
  const locations=data.locations ?? emptyLocations();
  const orderedPeople=orderedLocationPeople(data,locations.people);
  const candidates=locationPersonCandidates(data);
  const [category,setCategory]=useState(candidates.some(item=>item.categories.some(category=>['人物','ナンバー'].includes(category)))?'人物・ナンバー':'');
  const [checkedPeople,setCheckedPeople]=useState<string[]>([]);
  const [checkedTimes,setCheckedTimes]=useState<string[]>([]);
  const [manualTimes,setManualTimes]=useState<string[]>([]);
  const [start,setStart]=useState('01'),[end,setEnd]=useState('10'),[free,setFree]=useState('');
  const [transposed,setTransposed]=useState(locations.transposed ?? false);
  const [error,setError]=useState('');
  const people=checkedPeople.filter(word=>candidates.some(candidate=>candidate.word === word && !candidate.existing.length));
  const labels=checkedTimes.filter(label=>!locations.times.some(time=>time.label === label));
  const visible=candidates.filter(candidate=>!category || (category === '人物・ナンバー'?candidate.categories.some(item=>['人物','ナンバー'].includes(item)):candidate.categories.includes(category)));
  const timeLabels=[...new Set([...locations.times.map(time=>time.label),...locationTimeKeywords(data),...manualTimes])];
  let previewId=0;
  const usedIds=new Set(locations.times.map(time=>time.id));
  const preview=addLocationAxes(data,people,labels,transposed,()=>{let id:string;do{id='location-preview-'+previewId++;}while(usedIds.has(id));usedIds.add(id);return id;}).locations!;
  const addedPeople=new Set(preview.people.filter(word=>!locations.people.includes(word)));
  const addedTimes=new Set(preview.times.filter(time=>!locations.times.some(existing=>existing.id === time.id)).map(time=>time.id));
  function toggle(items:string[],word:string){return items.includes(word)?items.filter(item=>item !== word):[...items,word];}
  function addLabels(values:string[]){setManualTimes(previous=>[...new Set([...previous,...values])]);setCheckedTimes(previous=>[...new Set([...previous,...values.filter(value=>!locations.times.some(time=>time.label === value))])]);setError('');}
  function applyExisting(next:Locations){update({...data,locations:next});setError('');}
  function move<T>(items:T[],index:number,direction:number){const next=[...items];[next[index],next[index+direction]]=[next[index+direction],next[index]];return next;}
  const changed=people.length>0 || labels.length>0 || transposed !== (locations.transposed ?? false);
  return <dialog ref={dialog} className="settings-dialog location-axis-dialog" aria-label="人物・時間を選択" onCancel={close}>
    <div className="location-axis-header"><h2>人物・時間を選択</h2><button type="button" onClick={close}>閉じる</button></div>
    <div className="location-axis-body">
      <div className="location-axis-selectors">
        <section aria-label="人物の選択"><div className="location-axis-title"><h3>人物</h3><span>{people.length}人を追加</span></div>
          <label className="location-axis-category">分類<select aria-label="人物候補の分類" value={category} onChange={event=>setCategory(event.target.value)}><option value="">すべて</option><option value="人物・ナンバー">人物・ナンバー</option>{data.categoryOrder.map(item=><option key={item}>{item}</option>)}</select></label>
          <div className="location-axis-tools"><button type="button" onClick={()=>setCheckedPeople(previous=>[...new Set([...previous,...visible.filter(item=>!item.existing.length).map(item=>item.word)])])}>表示中をすべて選択</button><button type="button" disabled={!people.length} onClick={()=>setCheckedPeople([])}>追加分を解除</button></div>
          <div className="location-person-options">{visible.map(candidate=>{const existing=candidate.existing.length>0;return <button type="button" key={candidate.word} className={'location-person-option'+(existing?' is-existing':'')} aria-pressed={existing || people.includes(candidate.word)} disabled={existing} onClick={()=>setCheckedPeople(previous=>toggle(previous,candidate.word))}><span>{existing || people.includes(candidate.word)?'✓':'＋'} *{candidate.word}</span>{candidate.members.length>1 && <small>{candidate.members.filter(word=>word !== candidate.word).map(word=>'*'+word).join(' · ')}</small>}{existing && <small>追加済み</small>}</button>;})}</div>{!visible.length && <p className="muted">候補なし</p>}
        </section>
        <section aria-label="時間の選択"><div className="location-axis-title"><h3>時間</h3><span>{labels.length}件を追加</span></div>
          <div className="location-axis-tools"><button type="button" disabled={!timeLabels.length} onClick={()=>setCheckedTimes(timeLabels.filter(label=>!locations.times.some(time=>time.label === label)))}>すべて選択</button><button type="button" disabled={!labels.length} onClick={()=>setCheckedTimes([])}>追加分を解除</button></div>
          <div className="location-time-options">{timeLabels.map(label=>{const existing=locations.times.some(time=>time.label === label);return <button type="button" key={label} className={existing?'is-existing':undefined} disabled={existing} aria-pressed={existing || labels.includes(label)} onClick={()=>setCheckedTimes(previous=>toggle(previous,label))}>{label}{existing && <small>追加済み</small>}</button>;})}</div>
          <details className="location-time-inputs"><summary>連番・自由入力</summary>
            <form className="location-time-range" onSubmit={event=>{event.preventDefault();try{addLabels(timeLabelRange(start,end));}catch(reason){setError((reason as Error).message);}}}><label>開始<input aria-label="連番の開始" inputMode="numeric" value={start} onChange={event=>setStart(event.target.value)}/></label><label>終了<input aria-label="連番の終了" inputMode="numeric" value={end} onChange={event=>setEnd(event.target.value)}/></label><button>選択に追加</button></form>
            <form className="location-time-free" onSubmit={event=>{event.preventDefault();const values=timeLabelLines(free);if(!values.length){setError('時間名を入力してください。');return;}addLabels(values);setFree('');}}><label>時間名<textarea aria-label="時間名を改行で入力" placeholder={'事件前\n事件直後'} value={free} onChange={event=>setFree(event.target.value)}/></label><button>選択に追加</button></form>
          </details>
        </section>
      </div>
      <section className="location-axis-preview" aria-label="追加後の表"><div className="location-axis-title"><h3>追加後の表</h3><span>人物 {preview.people.length} × 時間 {preview.times.length}</span><button type="button" aria-pressed={transposed} onClick={()=>setTransposed(value=>!value)}>行列を入れ替え</button></div><div className="location-axis-preview-scroll"><LocationGrid locations={preview} transposed={transposed} addedPeople={addedPeople} addedTimes={addedTimes} preview/></div></section>
      {(locations.people.length>0 || locations.times.length>0) && <details className="location-axis-existing"><summary>並べ替え・削除</summary>
        <h3>人物 <button type="button" disabled={!locations.manualPeopleOrder} onClick={()=>applyExisting({...locations,manualPeopleOrder:false})}>番号順</button></h3><ul className="location-axis-list">{orderedPeople.map((person,index)=><li key={person}><span>*{person}</span><button type="button" aria-label={`${person}を前へ`} disabled={index===0} onClick={()=>applyExisting({...locations,people:move(orderedPeople,index,-1),manualPeopleOrder:true})}>↑</button><button type="button" aria-label={`${person}を後へ`} disabled={index===locations.people.length-1} onClick={()=>applyExisting({...locations,people:move(orderedPeople,index,1),manualPeopleOrder:true})}>↓</button><button type="button" onClick={()=>{if(locations.entries.some(entry=>entry.person === person) && !window.confirm(`「${person}」とその居場所記録を表から削除しますか？`))return;applyExisting({...locations,people:locations.people.filter(item=>item !== person),entries:locations.entries.filter(entry=>entry.person !== person)});}}>削除</button></li>)}</ul>
        <h3>時間</h3><ul className="location-axis-list">{locations.times.map((time,index)=><li key={time.id}><span>{time.label}</span><button type="button" aria-label={`${time.label}を前へ`} disabled={index===0} onClick={()=>applyExisting({...locations,times:move(locations.times,index,-1)})}>↑</button><button type="button" aria-label={`${time.label}を後へ`} disabled={index===locations.times.length-1} onClick={()=>applyExisting({...locations,times:move(locations.times,index,1)})}>↓</button><button type="button" onClick={()=>{if(locations.entries.some(entry=>entry.timeId === time.id) && !window.confirm(`「${time.label}」とその居場所記録を表から削除しますか？`))return;applyExisting({...locations,times:locations.times.filter(item=>item.id !== time.id),entries:locations.entries.filter(entry=>entry.timeId !== time.id)});}}>削除</button></li>)}</ul>
      </details>}
    </div>
    <div className="location-axis-footer">{error && <p role="alert">{error}</p>}<button type="button" className="primary" disabled={!changed} onClick={()=>{try{update(addLocationAxes(data,people,labels,transposed));close();}catch(reason){setError((reason as Error).message);}}}>{people.length || labels.length?`人物${people.length}${transposed?'列':'行'}・時間${labels.length}${transposed?'行':'列'}を追加`:'表示を適用'}</button></div>
  </dialog>;
}
