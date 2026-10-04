import { LinkKindControl, updateLink } from './LinkKindControl';
import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ReactFlow, Handle, Position, ConnectionMode, Background, BackgroundVariant, useNodesState, type Node, type NodeProps, type Edge, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { connect, placeCard, personBoardCards, movePersonCard, removeCard, contextWords, type Data } from './model';

type KeywordNode = Node<{ word: string; category: string; missing: boolean; members: string[]; items: {word:string;status: 'tentative'|'confirmed'}[]; noteCount: number }, 'keyword'>;
function KeywordCard({ data }: NodeProps<KeywordNode>) {
  return <div className="board-card"><Handle type="source" position={Position.Left} id="left" aria-label="左の接続点"/><small>分類：{data.category}{data.missing ? ' · メモなし' : ''}</small><div>{data.members.map(word=>'*'+word).join(' ｜ ')}</div>{data.members.length>1 && <><small>同一人物 · 確定 ／ 関連メモ {data.noteCount}件</small>{data.items.length>0 && <section className="person-items"><small>関連アイテム</small>{data.items.map(item=><span key={item.word} className={item.status}>*{item.word} · {item.status==='confirmed'?'確定':'仮'}</span>)}</section>}</>}<Handle type="source" position={Position.Right} id="right" aria-label="右の接続点"/></div>;
}
const nodeTypes = { keyword: KeywordCard };
type Props = { scopeWords?: string[]; data: Data; update: Dispatch<SetStateAction<Data>>; words: string[]; openNotes: (word: string) => void; embedded?: boolean; focusWord?: string | null; onSelect?: (word: string) => void };
export function RelationshipBoard({ data, update, words, openNotes, embedded = false, focusWord = null, onSelect, scopeWords }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<KeywordNode>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<KeywordNode, Edge> | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  useEffect(() => { if (embedded) { setSelectedWord(focusWord); setSelectedLink(null); } }, [focusWord, embedded]);
  const allowedWords = scopeWords ? new Set(scopeWords) : contextWords(data, focusWord);
  const visibleCards = personBoardCards(data, allowedWords);
  const nodeFor = (word: string) => visibleCards.find(card => card.members.includes(word));
  useEffect(() => {
    setNodes(previous => visibleCards.map(card => ({ id: card.word, type: 'keyword', position: { x: card.x, y: card.y }, data: { word: card.word, category: card.members.length>1 ? '人物カード' : data.categories[card.word] ?? '未分類', missing: !card.members.some(word=>words.includes(word)), members: card.members, items: card.items, noteCount: card.noteCount }, selected: embedded ? card.members.includes(focusWord ?? '') : previous.find(node => node.id === card.word)?.selected ?? false })));
  }, [data.board.cards, data.categories, data.notes, data.links, focusWord, scopeWords?.join('\u0000'), words.join('\u0000'), setNodes]);
  const edges = useMemo<Edge[]>(() => {

    return data.links.filter(link => nodeFor(link.a) && nodeFor(link.b) && nodeFor(link.a)!.word !== nodeFor(link.b)!.word).map(link => ({ id: link.id, source: nodeFor(link.a)!.word, target: nodeFor(link.b)!.word, sourceHandle: nodeFor(link.a)!.x <= nodeFor(link.b)!.x ? 'right' : 'left', targetHandle: nodeFor(link.a)!.x <= nodeFor(link.b)!.x ? 'left' : 'right', type: 'straight', selected: selectedLink === link.id, ariaLabel: `*${link.a} と *${link.b} · ${link.kind === 'identity' ? '同一人物 · ' : ''}${link.status === 'confirmed' ? '確定' : '仮'}`, style: { stroke: link.status === 'confirmed' ? '#4c624d' : '#99a28f', strokeWidth: link.status === 'confirmed' ? 3 : 1.5, strokeDasharray: link.status === 'confirmed' ? undefined : '6 5' }, interactionWidth: 22 }));
  }, [data.links, data.board.cards, data.notes, focusWord, scopeWords?.join('\u0000'), selectedLink]);
  const link = data.links.find(item => item.id === selectedLink);
  function add(word: string) {
    const rect = canvas.current?.getBoundingClientRect();
    const point = flow && rect ? flow.screenToFlowPosition({ x: rect.left + rect.width / 2 - 90, y: rect.top + rect.height / 2 - 35 }) : { x: 120, y: 100 };
    // Offset new cards so adding several does not put them directly on top of each other.
    const offset = data.board.cards.length % 6 * 24;
    update(previous => placeCard(previous, word, point.x + offset, point.y + offset));
    setSelectedWord(word); setSelectedLink(null);
  }
  return <main className={'relationship-board' + (embedded ? ' embedded-board' : '')} aria-label="関係図">{!embedded && <aside className="board-sidebar" aria-label="関係図のキーワード"><h2>カードを置く</h2><input type="search" aria-label="関係図のキーワードを検索" placeholder="キーワードを検索" value={search} onChange={event => setSearch(event.target.value)}/><div className="board-keywords">{words.filter(word => word.includes(search)).map(word => {
    const placed = data.board.cards.some(card => card.word === word);
    return <div key={word}><button className="word" onClick={() => { if (placed) { setSelectedWord(word); setSelectedLink(null); void flow?.fitView({ nodes: [{ id: word }], maxZoom: 1, padding: 1 }); } else add(word); }}><span className="keyword-label">*{word}</span><span>{placed ? '配置済' : '＋置く'}</span></button></div>;
  })}{!words.length && <p className="muted">メモでキーワードを登録すると、ここから置けます。</p>}</div></aside>}
    <section className="board-panel" aria-label="関係図キャンバス"><div className="board-toolbar"><div>{embedded && focusWord && !visibleCards.some(card => card.members.includes(focusWord)) && <button onClick={() => add(focusWord)}>選択キーワードを図に置く</button>}<button onClick={() => void flow?.zoomIn()}>拡大</button><button onClick={() => void flow?.zoomOut()}>縮小</button><button onClick={() => void flow?.fitView({ padding: .25, maxZoom: 1 })} disabled={!nodes.length}>全体を表示</button></div><span>接続点から線を引いて結ぶ · 空白をドラッグして移動</span></div>
      <div ref={canvas} className="board-canvas"><ReactFlow<KeywordNode, Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setFlow} onNodesChange={changes => {
        onNodesChange(changes);
        const moved = changes.filter(change => change.type === 'position' && change.position && !change.dragging);
        if (moved.length) update(previous => moved.reduce((next, change) => change.type === 'position' && change.position ? movePersonCard(next, change.id, change.position.x, change.position.y) : next, previous));
      }} connectionMode={ConnectionMode.Loose} defaultViewport={data.board.viewport} minZoom={.1} maxZoom={2} deleteKeyCode={null} onConnect={connection => { if (connection.source && connection.target) update(previous => connect(previous, connection.source, connection.target, crypto.randomUUID())); }} isValidConnection={connection => connection.source !== connection.target && !data.links.some(item => (item.a === connection.source && item.b === connection.target) || (item.a === connection.target && item.b === connection.source))} onNodeDragStop={(_event, _node, moved) => update(previous => moved.reduce((next, node) => movePersonCard(next, node.id, node.position.x, node.position.y), previous))} onMoveEnd={(_event, viewport) => update(previous => ({ ...previous, board: { ...previous.board, viewport } }))} onNodeClick={(_event, node) => { setSelectedWord(node.id); setSelectedLink(null); onSelect?.(node.id); }} onEdgeClick={(_event, edge) => { setSelectedLink(edge.id); setSelectedWord(null); }} onPaneClick={() => { setSelectedWord(null); setSelectedLink(null); }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#dce1d6"/></ReactFlow>
        {!nodes.length && <div className="board-empty"><p>左のキーワードを選び、「選択キーワードを図に置く」を押してください。</p><p>カードは自由に移動できます。結びは一覧と共通です。</p></div>}
      </div>
      <div className="board-inspector" aria-live="polite">{link ? <><span className={'board-line ' + link.status} aria-hidden="true"/><span>*{link.a} ↔ *{link.b} · {link.kind === 'identity' ? '同一人物 · ' : ''}{link.status === 'confirmed' ? '確定' : '仮'}</span><LinkKindControl data={data} link={link} update={update}/><button onClick={() => updateLink(data, link, link.kind ?? 'related', link.status === 'confirmed' ? 'tentative' : 'confirmed', update)}>{link.status === 'confirmed' ? '仮に戻す' : '確定にする'}</button><button onClick={() => { if (window.confirm('この結びを解除しますか？')) { update(previous => ({ ...previous, links: previous.links.filter(item => item.id !== link.id) })); setSelectedLink(null); } }}>結びを外す</button></> : selectedWord && visibleCards.some(card => card.members.includes(selectedWord)) ? <><span>{visibleCards.find(card=>card.members.includes(selectedWord))?.members.map(word=>'*'+word).join(' ｜ ')}</span><button onClick={() => openNotes(selectedWord)}>関連メモを開く</button>{visibleCards.find(card=>card.members.includes(selectedWord))!.members.length>1 && <button onClick={()=>{const identity=data.links.find(link=>link.kind==='identity'&&link.status==='confirmed'&&(link.a===selectedWord||link.b===selectedWord));if(identity)updateLink(data,identity,'identity','tentative',update);}}>同一人物を仮に戻す</button>}<button onClick={() => { update(previous => visibleCards.find(card=>card.members.includes(selectedWord))!.members.reduce((next,word)=>removeCard(next,word),previous)); setSelectedWord(null); }}>図から外す</button><small>メモと結びは残ります</small></> : <span className="muted">カードや線を選ぶと、操作を表示します。仮：薄い破線 ／ 確定：太い実線</span>}</div>
    </section>
  </main>;
}
