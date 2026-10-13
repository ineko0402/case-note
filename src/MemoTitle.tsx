import './MemoTitle.css';

export function MemoTitle({value,onChange}: {value:string;onChange:(value:string)=>void}) {
 return <label className="memo-title-field">タイトル <small>任意・キーワード化しません</small><input type="text" value={value} placeholder="例：01-AT-2" onChange={event=>onChange(event.target.value)}/></label>;
}
