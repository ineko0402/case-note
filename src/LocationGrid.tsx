import { locationCoordinates } from './locationAxes';
import { locationCell, type Locations } from './locations';

type Props={locations:Locations;people?:string[];transposed:boolean;onSelect?:(person:string,timeId:string)=>void;addedPeople?:Set<string>;addedTimes?:Set<string>;preview?:boolean};
export function LocationGrid({locations,people=locations.people,transposed,onSelect,addedPeople=new Set(),addedTimes=new Set(),preview=false}:Props) {
  const persons=people.map(person=>({key:person,label:'*'+person,added:addedPeople.has(person)}));
  const times=locations.times.map(time=>({key:time.id,label:time.label,added:addedTimes.has(time.id)}));
  const rows=transposed?times:persons,columns=transposed?persons:times;
  const visibleRows=preview?rows.slice(0,5):rows,visibleColumns=preview?columns.slice(0,5):columns;
  return <table className={'location-table'+(preview?' location-preview-table':'')} aria-label={preview?'追加後の表':'人物と時間の居場所表'}><thead><tr><th scope="col">{transposed?'時間＼人物':'人物＼時間'}</th>{visibleColumns.map(column=><th scope="col" key={column.key} className={column.added?'axis-added':undefined}>{column.label}</th>)}{columns.length>visibleColumns.length && <th scope="col">ほか{columns.length-visibleColumns.length}列</th>}</tr></thead><tbody>{visibleRows.map(row=><tr key={row.key}><th scope="row" className={row.added?'axis-added':undefined}>{row.label}</th>{visibleColumns.map(column=>{
    const {person,timeId}=locationCoordinates(row.key,column.key,transposed);
    const cell=locationCell(locations,person,timeId),time=locations.times.find(time=>time.id === timeId)!;
    const label=`${person}・${time.label}：${cell.entries.length?cell.entries.map(entry=>`${entry.place}・${entry.status === 'confirmed'?'確定':'仮'}`).join('、'):'居場所未判明'}`;
    const content=cell.state === 'unknown'?<strong>？</strong>:<>{cell.entries.map(entry=><span key={entry.id} className="location-value">{entry.place}<small>{entry.status === 'confirmed'?'確定':'仮'}{entry.noteIds.length?` · 根拠${entry.noteIds.length}件`:''}</small></span>)}{cell.state === 'multiple' && <small className="location-warning">複数の記録</small>}</>;
    return <td key={column.key} className={'location-cell '+cell.state}>{onSelect?<button type="button" aria-label={label} onClick={()=>onSelect(person,timeId)}>{content}</button>:<div className="location-cell-content" aria-label={label}>{content}</div>}</td>;
  })}{columns.length>visibleColumns.length && <td>…</td>}</tr>)}{rows.length>visibleRows.length && <tr><td colSpan={visibleColumns.length+1+(columns.length>visibleColumns.length?1:0)}>ほか{rows.length-visibleRows.length}行</td></tr>}</tbody></table>;
}
