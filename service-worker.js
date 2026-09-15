const CACHE_NAME = 'orbit-pwa-v7';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './vendor/pdf.min.mjs',
  './vendor/pdf.worker.min.mjs'
];

const GOLD_HIGHLIGHT_CSS = `
.unit{transition:background .18s ease,color .18s ease,opacity .18s ease,box-shadow .18s ease,filter .18s ease}
.unit.bookmarked{background:linear-gradient(180deg,rgba(70,18,18,.74),rgba(28,6,6,.86));color:#fff;box-shadow:inset 0 0 0 1px rgba(255,43,43,.72),0 0 0 4px rgba(255,43,43,.08);opacity:1}
.unit.bookmarked::before{content:"◆ ";color:var(--red);font-weight:900;text-shadow:0 0 12px rgba(255,43,43,.5)}
.unit.current{background:linear-gradient(100deg,#fff4b8 0%,#d6a13a 38%,#fff1ad 68%,#8d5c16 100%)!important;color:#070706!important;outline:1px solid rgba(255,235,168,.85)!important;opacity:1;box-shadow:0 0 0 5px rgba(216,163,58,.10),0 12px 28px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.75)!important;filter:saturate(1.08)}
.unit.current.bookmarked{outline-color:rgba(255,43,43,.9)!important;box-shadow:0 0 0 2px rgba(255,43,43,.72),0 0 0 7px rgba(214,161,58,.12),0 12px 28px rgba(0,0,0,.34)!important}
.unit.current.bookmarked::before{color:#8b0909;text-shadow:none}
.dockMark.justMarked{animation:markPulse .52s ease both}
@keyframes markPulse{0%{transform:scale(1);background:rgba(255,43,43,.08)}45%{transform:scale(1.05);background:rgba(255,43,43,.2);box-shadow:0 0 0 6px rgba(255,43,43,.08)}100%{transform:scale(1);background:rgba(255,43,43,.13)}}
`;

const IOS_MARK_BRIDGE_JS = `
\n;(() => {
  const orbitInvertDefaultVersion = 1;
  DEFAULT_SETTINGS.pdfInverted = true;
  DEFAULT_SETTINGS.invertDefaultVersion = orbitInvertDefaultVersion;

  const orbitOriginalLoadSettings = loadSettings;
  loadSettings = async function(...args) {
    await orbitOriginalLoadSettings(...args);
    const saved = await storageGet(SETTINGS_KEY) || {};
    if (saved.invertDefaultVersion !== orbitInvertDefaultVersion) {
      settings.pdfInverted = true;
      settings.invertDefaultVersion = orbitInvertDefaultVersion;
      await storageSet({ [SETTINGS_KEY]: settings });
      applySettingsToControls();
      applyInvertState();
    }
  };

  const orbitBookmarkKey = id => 'bookmark_' + id;
  let orbitBookmarkIndex = null;

  function orbitApplyBookmarkVisual(index) {
    textUnits.forEach(unit => unit.span.classList.remove('bookmarked'));
    if (Number.isInteger(index) && textUnits[index]) {
      textUnits[index].span.classList.add('bookmarked');
    }
  }

  function orbitSyncDockMark() {
    const button = document.getElementById('dockMark');
    if (!button) return;
    button.disabled = !currentPdfId || !textUnits.length;
    button.classList.toggle('active', Number.isInteger(orbitBookmarkIndex));
  }

  async function orbitSaveBookmark() {
    if (!currentPdfId || !textUnits.length) return;
    const index = Math.max(0, Math.min(currentIndex, textUnits.length - 1));
    orbitBookmarkIndex = index;
    orbitApplyBookmarkVisual(index);
    setCurrent(index);
    scrollToIndex(index);
    await storageSet({
      [orbitBookmarkKey(currentPdfId)]: {
        index,
        text: (textUnits[index].displayText || textUnits[index].text || '').slice(0, 160),
        updatedAt: Date.now(),
        style: settings.style
      },
      [progressKey(currentPdfId)]: { index, updatedAt: Date.now(), style: settings.style }
    });
    const button = document.getElementById('dockMark');
    if (button) {
      button.classList.add('justMarked');
      setTimeout(() => button.classList.remove('justMarked'), 520);
    }
    setStatus('Marked section ' + (index + 1) + '.');
    orbitSyncDockMark();
    await renderList();
  }

  const originalRenderTextPane = renderTextPane;
  renderTextPane = function(...args) {
    originalRenderTextPane(...args);
    orbitApplyBookmarkVisual(orbitBookmarkIndex);
    orbitSyncDockMark();
  };

  const originalSetCurrent = setCurrent;
  setCurrent = function(index) {
    originalSetCurrent(index);
    orbitSyncDockMark();
  };

  const originalResetViewer = resetViewer;
  resetViewer = function(...args) {
    orbitBookmarkIndex = null;
    originalResetViewer(...args);
    orbitSyncDockMark();
  };

  const originalLoadPdf = loadPdf;
  loadPdf = async function(id) {
    await originalLoadPdf(id);
    const bookmark = await storageGet(orbitBookmarkKey(id));
    if (bookmark && Number.isInteger(bookmark.index) && textUnits.length) {
      orbitBookmarkIndex = Math.min(bookmark.index, Math.max(0, textUnits.length - 1));
      currentIndex = orbitBookmarkIndex;
      markReadThrough(currentIndex - 1);
      orbitApplyBookmarkVisual(orbitBookmarkIndex);
      setCurrent(currentIndex);
      scrollToIndex(currentIndex);
      setStatus('Marked resume point: section ' + (currentIndex + 1) + '.');
    } else {
      orbitBookmarkIndex = null;
    }
    orbitSyncDockMark();
  };

  document.getElementById('dockMark')?.addEventListener('click', orbitSaveBookmark);
  orbitSyncDockMark();
})();
`;

async function patchedTextResponse(event, patch, contentType) {
  const response = await fetch(event.request);
  const text = await response.text();
  const body = text + '\n' + patch;
  const patched = new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: { 'Content-Type': contentType, 'Cache-Control': 'no-cache' }
  });
  const copy = patched.clone();
  caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
  return patched;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== location.origin || event.request.method !== 'GET') return;

  if (url.pathname.endsWith('/styles.css')) {
    event.respondWith(patchedTextResponse(event, GOLD_HIGHLIGHT_CSS, 'text/css; charset=utf-8').catch(() => caches.match(event.request)));
    return;
  }

  if (url.pathname.endsWith('/app.js')) {
    event.respondWith(patchedTextResponse(event, IOS_MARK_BRIDGE_JS, 'text/javascript; charset=utf-8').catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
