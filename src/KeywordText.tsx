import { DraggableKeyword } from './KeywordDrag';
type Props = { text: string; active?: string | null; related?: Set<string>; onSelect?: (word: string) => void; connectionTargets?: Map<string, {status?: string; eligible?: boolean}>; connectionTarget?: string | null };
export function KeywordText({ text, active, related, onSelect, connectionTargets, connectionTarget }: Props) {
  return <>{text.split(/((?:^|\s)\*[^\s*]+)/gu).map((part, index) => {
    const match = part.match(/^(\s*)\*([^\s*]+)$/u);
    if (!match) return part;
    const word = match[2];
    if (connectionTargets) {
      const candidate = connectionTargets.get(word);
      const available = candidate && !candidate.status && candidate.eligible !== false;
      return <span key={index}>{match[1]}{available ? <button type="button" className="chip connectable-keyword" aria-pressed={word === connectionTarget} onClick={() => onSelect?.(word)}>*{word}</button> : <mark className={'chip ' + (word === active ? 'active-keyword' : 'connection-unavailable')} title={candidate?.status ? 'つながり済 · ' + (candidate.status === 'confirmed' ? '確定' : '仮') : word === active ? 'つなげる元のキーワード' : '絞り込みの対象外'}>*{word}{candidate?.status && <small> · つながり済</small>}</mark>}</span>;
    }
    const className = 'chip' + (word === active ? ' active-keyword' : related?.has(word) ? ' related-keyword' : '');
    return <span key={index}>{match[1]}{onSelect ? <DraggableKeyword word={word} className={className} pressed={word === active} onClick={() => onSelect(word)}>*{word}</DraggableKeyword> : <mark className={className}>*{word}</mark>}</span>;
  })}</>;
}
