export type InstallPrompt = Event & {
  prompt: () => Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallState = { hidden: boolean; available: boolean };

// The browser's prompt is single-use. Keep it separate from the help dialog.
export function watchInstallation(host: Window, changed: (state: InstallState) => void) {
  const mode = host.matchMedia('(display-mode: standalone)');
  let installed = false;
  let pending: InstallPrompt | null = null;
  const state = () => ({
    hidden: installed || mode.matches || (host.navigator as Navigator & { standalone?: boolean }).standalone === true,
    available: pending !== null
  });
  const publish = () => changed(state());
  function offered(event: Event) {
    event.preventDefault();
    pending = event as InstallPrompt;
    publish();
  }
  function completed() { installed = true; pending = null; publish(); }
  host.addEventListener('beforeinstallprompt', offered);
  host.addEventListener('appinstalled', completed);
  mode.addEventListener('change', publish);
  publish();
  return {
    async install() {
      const event = pending;
      if (!event || state().hidden) return false;
      pending = null;
      publish();
      try {
        // Call immediately inside the user's click, before any await.
        const result = await event.prompt();
        if (result.outcome === 'accepted') completed();
        return true;
      } catch { return false; }
    },
    dispose() {
      host.removeEventListener('beforeinstallprompt', offered);
      host.removeEventListener('appinstalled', completed);
      mode.removeEventListener('change', publish);
    }
  };
}
