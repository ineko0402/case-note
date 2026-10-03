type Props = { text: string; active?: string | null; related?: Set<string>; onSelect?: (word: string) => void };
export function KeywordText({ text, active, related, onSelect }: Props) {
  return <>{text.split(/((?:^|\s)\*[^\s*]+)/gu).map((part, index) => {
    const match = part.match(/^(\s*)\*([^\s*]+)$/u);
    if (!match) return part;
    const word = match[2];
    const className = 'chip' + (word === active ? ' active-keyword' : related?.has(word) ? ' related-keyword' : '');
    return <span key={index}>{match[1]}{onSelect ? <button className={className} aria-pressed={word === active} onClick={() => onSelect(word)}>*{word}</button> : <mark className={className}>*{word}</mark>}</span>;
  })}</>;
}
