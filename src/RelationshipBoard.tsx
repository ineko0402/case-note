import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ReactFlow, Handle, Position, ConnectionMode, Background, BackgroundVariant, useNodesState, type Node, type NodeProps, type Edge, type ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { connect, placeCard, removeCard, contextWords, type Data } from './model';

type KeywordNode = Node<{ word: string; category: string; missing: boolean }, 'keyword'>;
function KeywordCard({ data }: NodeProps<KeywordNode>) {
  return <div className="board-card"><Handle type="source" position={Position.Left} id="left" aria-label="左の接続点"/><small>分類：{data.category}{data.missing ? ' · メモなし' : ''}</small><div>*{data.word}</div><Handle type="source" position={Position.Right} id="right" aria-label="右の接続点"/></div>;
}
const nodeTypes = { keyword: KeywordCard };
type Props = { data: Data; update: Dispatch<SetStateAction<Data>>; words: string[]; openNotes: (word: string) => void; embedded?: boolean; focusWord?: string | null; onSelect?: (word: string) => void };
export function RelationshipBoard({ data, update, words, openNotes, embedded = false, focusWord = null, onSelect }: Props) {
  const [nodes, setNodes, onNodesChange] = useNodesState<KeywordNode>([]);
  const [flow, setFlow] = useState<ReactFlowInstance<KeywordNode, Edge> | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  useEffect(() => { if (embedded) { setSelectedWord(focusWord); setSelectedLink(null); } }, [focusWord, embedded]);
  const allowedWords = contextWords(data, focusWord);
  const visibleCards = data.board.cards.filter(card => !allowedWords || allowedWords.has(card.word));
  useEffect(() => {
    setNodes(previous => visibleCards.map(card => ({ id: card.word, type: 'keyword', position: { x: card.x, y: card.y }, data: { word: card.word, category: data.categories[card.word] ?? '未分類', missing: !words.includes(card.word) }, selected: focusWord ? focusWord === card.word : previous.find(node => node.id === card.word)?.selected ?? false })));
  }, [data.board.cards, data.categories, data.notes, data.links, focusWord, words.join('\u0000'), setNodes]);
  const edges = useMemo<Edge[]>(() => {
    const present = new Set(visibleCards.map(card => card.word));
    return data.links.filter(link => present.has(link.a) && present.has(link.b)).map(link => ({ id: link.id, source: link.a, target: link.b, sourceHandle: data.board.cards.find(card => card.word === link.a)!.x <= data.board.cards.find(card => card.word === link.b)!.x ? 'right' : 'left', targetHandle: data.board.cards.find(card => card.word === link.a)!.x <= data.board.cards.find(card => card.word === link.b)!.x ? 'left' : 'right', type: 'straight', selected: selectedLink === link.id, ariaLabel: `*${link.a} と *${link.b} · ${link.status === 'confirmed' ? '確定' : '仮'}`, style: { stroke: link.status === 'confirmed' ? '#4c624d' : '#99a28f', strokeWidth: link.status === 'confirmed' ? 3 : 1.5, strokeDasharray: link.status === 'confirmed' ? undefined : '6 5' }, interactionWidth: 22 }));
  }, [data.links, data.board.cards, data.notes, focusWord, selectedLink]);
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
    <section className="board-panel" aria-label="関係図キャンバス"><div className="board-toolbar"><div>{embedded && focusWord && !data.board.cards.some(card => card.word === focusWord) && <button onClick={() => add(focusWord)}>選択キーワードを置く</button>}<button onClick={() => void flow?.zoomIn()}>拡大</button><button onClick={() => void flow?.zoomOut()}>縮小</button><button onClick={() => void flow?.fitView({ padding: .25, maxZoom: 1 })} disabled={!nodes.length}>全体を表示</button></div><span>接続点から線を引いて結ぶ · 空白をドラッグして移動</span></div>
      <div ref={canvas} className="board-canvas"><ReactFlow<KeywordNode, Edge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} onInit={setFlow} onNodesChange={changes => {
        onNodesChange(changes);
        const moved = changes.filter(change => change.type === 'position' && change.position && !change.dragging);
        if (moved.length) update(previous => ({ ...previous, board: { ...previous.board, cards: previous.board.cards.map(card => { const change = moved.find(item => item.type === 'position' && item.id === card.word); return change?.type === 'position' && change.position ? { ...card, x: change.position.x, y: change.position.y } : card; }) } }));
      }} connectionMode={ConnectionMode.Loose} defaultViewport={data.board.viewport} minZoom={.1} maxZoom={2} deleteKeyCode={null} onConnect={connection => { if (connection.source && connection.target) update(previous => connect(previous, connection.source, connection.target, crypto.randomUUID())); }} isValidConnection={connection => connection.source !== connection.target && !data.links.some(item => (item.a === connection.source && item.b === connection.target) || (item.a === connection.target && item.b === connection.source))} onNodeDragStop={(_event, _node, moved) => update(previous => ({ ...previous, board: { ...previous.board, cards: previous.board.cards.map(card => { const node = moved.find(item => item.id === card.word); return node ? { ...card, x: node.position.x, y: node.position.y } : card; }) } }))} onMoveEnd={(_event, viewport) => update(previous => ({ ...previous, board: { ...previous.board, viewport } }))} onNodeClick={(_event, node) => { setSelectedWord(node.id); setSelectedLink(null); onSelect?.(node.id); }} onEdgeClick={(_event, edge) => { setSelectedLink(edge.id); setSelectedWord(null); }} onPaneClick={() => { setSelectedWord(null); setSelectedLink(null); }}><Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#dce1d6"/></ReactFlow>
        {!nodes.length && <div className="board-empty"><p>左のキーワードからカードを置いてください。</p><p>カードは自由に移動できます。結びは一覧と共通です。</p></div>}
      </div>
      <div className="board-inspector" aria-live="polite">{link ? <><span className={'board-line ' + link.status} aria-hidden="true"/><span>*{link.a} ↔ *{link.b} · {link.status === 'confirmed' ? '確定' : '仮'}</span><button onClick={() => update(previous => ({ ...previous, links: previous.links.map(item => item.id === link.id ? { ...item, status: item.status === 'confirmed' ? 'tentative' : 'confirmed' } : item) }))}>{link.status === 'confirmed' ? '仮に戻す' : '確定にする'}</button><button onClick={() => { if (window.confirm('この結びを解除しますか？')) { update(previous => ({ ...previous, links: previous.links.filter(item => item.id !== link.id) })); setSelectedLink(null); } }}>解除</button></> : selectedWord && data.board.cards.some(card => card.word === selectedWord) ? <><span>*{selectedWord}</span><button onClick={() => openNotes(selectedWord)}>関連メモを開く</button><button onClick={() => { update(previous => removeCard(previous, selectedWord)); setSelectedWord(null); }}>図から外す</button><small>メモと結びは残ります</small></> : <span className="muted">カードや線を選ぶと、操作を表示します。仮：薄い破線 ／ 確定：太い実線</span>}</div>
    </section>
  </main>;
}
