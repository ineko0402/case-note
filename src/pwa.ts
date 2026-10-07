/// <reference types="vite/client" />

// Keep an open editor on its current version. A waiting worker activates after
// every Case Note window is closed, without forcing a reload or touching data.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none'
    }).then(registration => {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void registration.update().catch(() => {});
        }
      });
    }).catch(error => console.warn('オフライン用の準備ができませんでした。', error));
  }, { once: true });
}
