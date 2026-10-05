import { useRef } from 'react';
import { Icon } from './Icon';
import './Icon.css';

type Props = {label: string; placeholder: string; value: string; onChange: (value: string) => void};

export function SearchField({label, placeholder, value, onChange}: Props) {
  const input = useRef<HTMLInputElement>(null);
  return <div className="search-field">
    <input ref={input} type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/>
    {value && <button type="button" className="icon-button search-clear" aria-label={`${label}：検索文字を消す`} title="検索文字を消す" onClick={() => {onChange(''); input.current?.focus();}}><Icon name="close"/></button>}
  </div>;
}
