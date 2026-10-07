import { useEffect, useRef, useState } from 'react';
import { watchInstallation, type InstallState } from './installation';
import './InstallApp.css';

export function InstallApp() {
  const [state, setState] = useState<InstallState>(() => ({
    hidden: window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true,
    available: false
  }));
  const controller = useRef<ReturnType<typeof watchInstallation> | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [manualCopy, setManualCopy] = useState(false);
  const urlField = useRef<HTMLInputElement>(null);
  const pageUrl = window.location.href;
  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setFeedback('URLをコピーしました。Safariのアドレス欄に貼り付けてください。');
      setManualCopy(false);
    } catch {
      setManualCopy(true);
      setFeedback('コピーできませんでした。下のURLを選択してコピーしてください。');
      requestAnimationFrame(() => { urlField.current?.focus(); urlField.current?.select(); });
    }
  }
  function openSafari() {
    setFeedback('Safariが開かない場合は「URLをコピー」を使ってください。');
    // A best-effort handoff; no success or installation is inferred from it.
    try { window.location.assign(pageUrl.replace(/^https:/, 'x-safari-https:')); }
    catch { setFeedback('Safariを開けませんでした。「URLをコピー」を使ってください。'); }
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  useEffect(() => {
    controller.current = watchInstallation(window, setState);
    return () => { controller.current?.dispose(); controller.current = null; };
  }, []);
  useEffect(() => {
    if (!help || state.hidden) return;
    dialog.current?.showModal();
    return () => { button.current?.focus({ preventScroll: true }); };
  }, [help, state.hidden]);
  async function install() {
    if (busy) return;
    if (!state.available) { setFeedback(''); setManualCopy(false); setHelp(true); return; }
    setBusy(true);
    const handled = await controller.current?.install();
    setBusy(false);
    if (!handled) setHelp(true);
  }
  if (state.hidden) return null;
  return <>
    <button type="button" ref={button} disabled={busy} onClick={() => void install()} aria-haspopup={state.available ? undefined : 'dialog'}>アプリをインストール</button>
    {help && <dialog ref={dialog} className="settings-dialog install-dialog" aria-labelledby="install-title" onCancel={() => setHelp(false)} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const box = event.currentTarget.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setHelp(false);
    }}>
      <h2 id="install-title">Case Noteをアプリとして使う</h2>
      <p>ホーム画面やアプリ一覧から、Case Noteを開けます。</p>
      {appleMobile && <div className="install-transfer"><button type="button" disabled={!pageUrl.startsWith('https:')} onClick={openSafari}>Safariで開く</button><button type="button" onClick={() => void copyUrl()}>URLをコピー</button><p>Safariが開かない場合は、URLをコピーしてSafariに貼り付けてください。</p></div>}
      {appleMobile ? <ol><li>このページをSafariで開きます。</li><li>共有メニューから「ホーム画面に追加」を選びます。</li><li>「Webアプリとして開く」が表示されたらオンにし、「追加」を押します。</li></ol> : <><p>ブラウザのアドレスバーやメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。</p><p>項目が見つからない場合は、ChromeやEdgeなどの対応ブラウザで開いてください。インストールできるかどうかは、端末とブラウザによって異なります。</p></>}
      {feedback && <p role="status">{feedback}</p>}
      {manualCopy && <label className="install-url">このページのURL<input ref={urlField} type="url" readOnly value={pageUrl} onFocus={event => event.currentTarget.select()}/></label>}
      <p className="muted">メモの引き継ぎは環境によって異なります。必要なら先に「データ管理」でバックアップを保存し、アプリ側で復元してください。</p>
      <div className="actions"><button type="button" onClick={() => setHelp(false)}>閉じる</button></div>
    </dialog>}
  </>;
}
