const CACHE_NAME = 'orbit-pwa-v11';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './vendor/pdf.min.mjs',
  './vendor/pdf.worker.min.mjs'
];

const ORBIT_VIEWER_CSS = `
.unit.current {
  background: transparent !important;
  color: #fff !important;
  border-radius: 0 !important;
  box-shadow: inset 0 -0.16em 0 rgba(220, 172, 66, 0.72) !important;
  outline: 1px solid rgba(220, 172, 66, 0.42) !important;
  outline-offset: 0.08em !important;
}
body.pdf-inverted .unit.current {
  box-shadow: inset 0 -0.16em 0 rgba(220, 172, 66, 0.78) !important;
}
.readerGrid {
  align-items: stretch !important;
}
.pdfPreview,
.textReader {
  min-height: 0 !important;
  overflow: hidden !important;
}
.pdfPreview {
  background: linear-gradient(180deg, rgba(18,18,18,0.74), rgba(5,5,5,0.9)) !important;
}
.orbitPdfToolbar {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-left: auto;
}
.orbitPdfButton,
.orbitPdfChip {
  height: 2.1rem;
  min-width: 2.1rem;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.045);
  color: #f7f7f7;
  border-radius: 0.58rem;
  font: 800 0.86rem/1 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.7rem;
}
.orbitPdfButton:active {
  transform: translateY(1px);
}
.orbitPdfViewer {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  overflow: auto;
  padding: 1.2rem 0 7rem;
  background: radial-gradient(circle at 50% 0%, rgba(255,255,255,0.045), transparent 28%), #050505;
  border-top: 1px solid rgba(255,255,255,0.08);
  scrollbar-color: rgba(255,255,255,0.25) transparent;
}
.orbitPdfStage {
  width: max-content;
  min-width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
}
.orbitPdfPage {
  position: relative;
  background: #000;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.09), 0 22px 54px rgba(0,0,0,0.55);
  overflow: visible;
}
.orbitPdfPage.is-active {
  box-shadow: 0 0 0 2px rgba(220,172,66,0.82), 0 0 0 6px rgba(220,172,66,0.12), 0 26px 64px rgba(0,0,0,0.62);
}
.orbitPdfPage canvas {
  display: block;
  width: 100%;
  height: 100%;
  filter: invert(1) hue-rotate(180deg);
}
.orbitPdfViewer:not(.inverted) .orbitPdfPage canvas {
  filter: none;
}
.orbitReadingBadge {
  position: absolute;
  top: 0.8rem;
  left: 1rem;
  z-index: 2;
  color: #f3d16a;
  border: 1px solid rgba(220,172,66,0.78);
  background: rgba(0,0,0,0.72);
  border-radius: 999px;
  padding: 0.36rem 0.74rem;
  font-weight: 900;
  font-size: 0.82rem;
  box-shadow: 0 0 22px rgba(220,172,66,0.14);
}
.orbitPdfEmpty,
.orbitPdfLoading {
  min-height: 58vh;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,0.55);
  font-weight: 800;
}
body[data-reader-pane='pdf'] .orbitPdfViewer {
  min-height: calc(100dvh - 15rem);
}
@media (max-width: 700px) {
  body[data-reader-pane='pdf'] .orbitPdfViewer {
    height: calc(100dvh - 15.5rem);
    min-height: calc(100dvh - 15.5rem);
  }
  .orbitPdfViewer {
    padding: 0.8rem 0 7rem;
  }
  .orbitPdfToolbar {
    gap: 0.35rem;
  }
  .orbitPdfButton,
  .orbitPdfChip {
    height: 2rem;
    min-width: 2rem;
    padding: 0 0.55rem;
  }
}
`;

const ORBIT_VIEWER_JS = `
;(() => {
  let orbitCurrentPdfBuffer = null;
  let orbitPdfResizeTimer = null;
  let orbitPdfState = {
    document: null,
    pages: [],
    pageCount: 0,
    currentPage: 1,
    targetPage: null,
    scale: 1,
    fitMode: true,
    baseWidth: 760,
    rendering: new Set(),
    rendered: new Map(),
    destroyed: false
  };

  function orbitPdfOptions(buffer) {
    return {
      data: buffer.slice(0),
      cMapUrl: new URL('./vendor/cmaps/', import.meta.url).toString(),
      cMapPacked: true,
      standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).toString()
    };
  }

  function orbitCleanupPdfViewer() {
    orbitPdfState.destroyed = true;
    if (orbitPdfResizeTimer) clearTimeout(orbitPdfResizeTimer);
    if (orbitPdfState.document) {
      try { orbitPdfState.document.destroy(); } catch (error) {}
    }
    orbitPdfState = {
      document: null,
      pages: [],
      pageCount: 0,
      currentPage: 1,
      targetPage: null,
      scale: 1,
      fitMode: true,
      baseWidth: 760,
      rendering: new Set(),
      rendered: new Map(),
      destroyed: false
    };
  }

  function orbitApplyInvertState() {
    const on = settings.pdfInverted !== false;
    document.body.classList.toggle('pdf-inverted', on);
    document.querySelectorAll('.pdfEmbed, .orbitPdfViewer').forEach((el) => el.classList.toggle('inverted', on));
    [invertBtn, mobileInvertBtn].forEach((btn) => {
      if (!btn) return;
      btn.textContent = on ? 'Invert On' : 'Invert Off';
      btn.setAttribute('aria-pressed', String(on));
    });
  }

  if (typeof applyInvertState === 'function') {
    applyInvertState = orbitApplyInvertState;
  }

  const orbitOriginalResetViewer = resetViewer;
  resetViewer = function(...args) {
    orbitCleanupPdfViewer();
    orbitCurrentPdfBuffer = null;
    return orbitOriginalResetViewer.apply(this, args);
  };

  const orbitOriginalLoadPdf = loadPdf;
  loadPdf = async function(id) {
    try {
      const rec = await getPdf(id);
      orbitCurrentPdfBuffer = rec && rec.buffer ? rec.buffer : null;
    } catch (error) {
      orbitCurrentPdfBuffer = null;
    }
    return orbitOriginalLoadPdf.call(this, id);
  };

  function orbitPageWidth() {
    const viewer = document.getElementById('orbitPdfViewer');
    if (!viewer) return 760;
    return Math.max(280, viewer.clientWidth - 32);
  }

  function orbitUpdateToolbar() {
    const page = document.getElementById('orbitPdfPageLabel');
    const zoom = document.getElementById('orbitPdfZoomLabel');
    if (page) page.textContent = String(orbitPdfState.currentPage) + ' / ' + String(Math.max(orbitPdfState.pageCount, 1));
    if (zoom) zoom.textContent = Math.round(orbitPdfState.scale * 100) + '%';
  }

  function orbitAttachPdfControls() {
    const prev = document.getElementById('orbitPdfPrev');
    const next = document.getElementById('orbitPdfNext');
    const out = document.getElementById('orbitPdfZoomOut');
    const inBtn = document.getElementById('orbitPdfZoomIn');
    const fit = document.getElementById('orbitPdfFit');
    const one = document.getElementById('orbitPdfActual');
    const viewer = document.getElementById('orbitPdfViewer');
    if (prev) prev.onclick = () => orbitScrollToPage(Math.max(1, orbitPdfState.currentPage - 1));
    if (next) next.onclick = () => orbitScrollToPage(Math.min(orbitPdfState.pageCount || 1, orbitPdfState.currentPage + 1));
    if (out) out.onclick = () => orbitSetZoom(orbitPdfState.scale - 0.15, false);
    if (inBtn) inBtn.onclick = () => orbitSetZoom(orbitPdfState.scale + 0.15, false);
    if (fit) fit.onclick = () => { orbitPdfState.fitMode = true; orbitLayoutPdfPages(true); };
    if (one) one.onclick = () => orbitSetZoom(1, false);
    if (viewer) {
      viewer.onscroll = () => {
        orbitUpdateCurrentPageFromScroll();
        orbitRenderVisiblePages();
      };
    }
  }

  function orbitSetZoom(nextScale, fitMode) {
    orbitPdfState.fitMode = !!fitMode;
    orbitPdfState.scale = Math.min(3.5, Math.max(0.35, nextScale));
    orbitLayoutPdfPages(true);
  }

  function orbitLayoutPdfPages(preserve) {
    const viewer = document.getElementById('orbitPdfViewer');
    if (!viewer || !orbitPdfState.pages.length) return;
    const previousPage = preserve ? orbitPdfState.currentPage : 1;
    let scale = orbitPdfState.scale;
    if (orbitPdfState.fitMode) {
      scale = orbitPageWidth() / orbitPdfState.baseWidth;
      orbitPdfState.scale = Math.min(3.5, Math.max(0.35, scale));
    }
    orbitPdfState.rendered.clear();
    orbitPdfState.pages.forEach((item) => {
      const viewport = item.baseViewport;
      item.scale = orbitPdfState.scale;
      item.width = Math.round(viewport.width * item.scale);
      item.height = Math.round(viewport.height * item.scale);
      item.shell.style.width = item.width + 'px';
      item.shell.style.height = item.height + 'px';
      const canvas = item.canvas;
      canvas.style.width = item.width + 'px';
      canvas.style.height = item.height + 'px';
      canvas.width = 1;
      canvas.height = 1;
    });
    orbitUpdateToolbar();
    requestAnimationFrame(() => {
      orbitScrollToPage(previousPage, 'auto');
      orbitRenderVisiblePages();
    });
  }

  function orbitHandleResize() {
    if (!orbitPdfState.fitMode) return;
    clearTimeout(orbitPdfResizeTimer);
    orbitPdfResizeTimer = setTimeout(() => orbitLayoutPdfPages(true), 120);
  }

  async function orbitRenderPdf(buffer) {
    const viewer = document.getElementById('orbitPdfViewer');
    if (!viewer || !buffer) return;
    orbitCleanupPdfViewer();
    orbitPdfState.destroyed = false;
    viewer.innerHTML = '<div class="orbitPdfLoading">Preparing PDF</div>';
    try {
      const task = pdfjsLib.getDocument(orbitPdfOptions(buffer));
      const pdf = await task.promise;
      if (orbitPdfState.destroyed) return;
      orbitPdfState.document = pdf;
      orbitPdfState.pageCount = pdf.numPages;
      viewer.innerHTML = '<div class="orbitPdfStage" id="orbitPdfStage"></div>';
      const stage = document.getElementById('orbitPdfStage');
      const firstPage = await pdf.getPage(1);
      const firstViewport = firstPage.getViewport({ scale: 1 });
      orbitPdfState.baseWidth = firstViewport.width || 760;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        const page = pageNum === 1 ? firstPage : await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1 });
        const shell = document.createElement('div');
        shell.className = 'orbitPdfPage';
        shell.dataset.page = String(pageNum);
        shell.innerHTML = '<canvas aria-label="Page ' + pageNum + '"></canvas>';
        stage.appendChild(shell);
        orbitPdfState.pages.push({ pageNum, page, baseViewport: viewport, shell, canvas: shell.querySelector('canvas'), scale: 1, width: viewport.width, height: viewport.height });
      }
      orbitAttachPdfControls();
      orbitLayoutPdfPages(false);
      window.addEventListener('resize', orbitHandleResize, { passive: true });
    } catch (error) {
      viewer.innerHTML = '<div class="orbitPdfEmpty">PDF preview unavailable</div>';
    }
  }

  function orbitRenderVisiblePages() {
    const viewer = document.getElementById('orbitPdfViewer');
    if (!viewer || !orbitPdfState.pages.length) return;
    const top = viewer.scrollTop - viewer.clientHeight * 0.7;
    const bottom = viewer.scrollTop + viewer.clientHeight * 1.7;
    orbitPdfState.pages.forEach((item) => {
      const offset = item.shell.offsetTop;
      if (offset + item.height >= top && offset <= bottom) orbitRenderPdfPage(item);
    });
  }

  async function orbitRenderPdfPage(item) {
    const key = item.pageNum + ':' + item.scale;
    if (orbitPdfState.rendered.get(item.pageNum) === key || orbitPdfState.rendering.has(key)) return;
    orbitPdfState.rendering.add(key);
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = item.page.getViewport({ scale: item.scale * dpr });
      item.canvas.width = Math.round(viewport.width);
      item.canvas.height = Math.round(viewport.height);
      item.canvas.style.width = item.width + 'px';
      item.canvas.style.height = item.height + 'px';
      const context = item.canvas.getContext('2d', { alpha: false });
      await item.page.render({ canvasContext: context, viewport }).promise;
      orbitPdfState.rendered.set(item.pageNum, key);
    } catch (error) {
    } finally {
      orbitPdfState.rendering.delete(key);
    }
  }

  function orbitUpdateCurrentPageFromScroll() {
    const viewer = document.getElementById('orbitPdfViewer');
    if (!viewer || !orbitPdfState.pages.length) return;
    const anchor = viewer.scrollTop + viewer.clientHeight * 0.34;
    let current = orbitPdfState.pages[0].pageNum;
    orbitPdfState.pages.forEach((item) => {
      if (item.shell.offsetTop <= anchor) current = item.pageNum;
    });
    orbitPdfState.currentPage = current;
    orbitMarkActivePage(current);
    orbitUpdateToolbar();
  }

  function orbitMarkActivePage(pageNum) {
    orbitPdfState.pages.forEach((item) => {
      item.shell.classList.toggle('is-active', item.pageNum === pageNum);
      let badge = item.shell.querySelector('.orbitReadingBadge');
      if (item.pageNum === pageNum) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'orbitReadingBadge';
          item.shell.appendChild(badge);
        }
        badge.textContent = 'Reading page ' + pageNum;
      } else if (badge) {
        badge.remove();
      }
    });
  }

  function orbitScrollToPage(pageNum, behavior) {
    const viewer = document.getElementById('orbitPdfViewer');
    const item = orbitPdfState.pages[Math.max(0, Math.min(pageNum - 1, orbitPdfState.pages.length - 1))];
    if (!viewer || !item) return;
    orbitPdfState.currentPage = item.pageNum;
    orbitMarkActivePage(item.pageNum);
    orbitUpdateToolbar();
    viewer.scrollTo({ top: Math.max(0, item.shell.offsetTop - 14), behavior: behavior || 'smooth' });
    orbitRenderVisiblePages();
  }

  window.setOrbitPdfActivePage = function(pageNum, options) {
    const target = Number(pageNum);
    if (!Number.isFinite(target) || target <= 0) return;
    orbitPdfState.targetPage = target;
    orbitPdfState.currentPage = Math.min(Math.max(1, Math.round(target)), Math.max(orbitPdfState.pageCount, 1));
    orbitMarkActivePage(orbitPdfState.currentPage);
    orbitUpdateToolbar();
    if (options && options.scroll) orbitScrollToPage(orbitPdfState.currentPage, options.behavior || 'smooth');
  };

  renderReader = function(name, pdfUrl, extractedText) {
    const viewer = $('viewer');
    viewer.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'readerGrid';
    grid.innerHTML = '<div class="pdfPreview"><h3><span>PDF preview</span><span class="orbitPdfToolbar"><button class="orbitPdfButton" id="orbitPdfPrev" type="button" aria-label="Previous page">‹</button><span class="orbitPdfChip" id="orbitPdfPageLabel">1 / 1</span><button class="orbitPdfButton" id="orbitPdfNext" type="button" aria-label="Next page">›</button><button class="orbitPdfButton" id="orbitPdfZoomOut" type="button" aria-label="Zoom out">−</button><span class="orbitPdfChip" id="orbitPdfZoomLabel">100%</span><button class="orbitPdfButton" id="orbitPdfZoomIn" type="button" aria-label="Zoom in">+</button><button class="orbitPdfButton" id="orbitPdfFit" type="button">Fit</button><button class="orbitPdfButton" id="orbitPdfActual" type="button">100</button></span></h3><div class="orbitPdfViewer inverted" id="orbitPdfViewer"></div></div><div class="textReader"><h3>Read-aloud text <span id="modeBadge" class="modeBadge"></span></h3><div class="textContent" id="textContent"></div></div>';
    viewer.appendChild(grid);
    renderTextPane(extractedText);
    applyInvertState();
    if (orbitCurrentPdfBuffer) orbitRenderPdf(orbitCurrentPdfBuffer);
  };

  renderTextPane = function(extractedText) {
    textUnits = [];
    const target = $('textContent');
    if (!target) return;
    target.innerHTML = '';

    if (!String(extractedText || '').trim()) {
      target.innerHTML = '<div class="warning"><strong>No readable text found.</strong><br>This PDF may be scanned as images, protected, or missing a usable text map. Try an OCR version of the PDF.</div>';
      setStatus('PDF saved, but no readable text was found.');
      return;
    }

    if ($('modeBadge')) $('modeBadge').textContent = currentStyleLabel();

    const hint = document.createElement('p');
    hint.className = 'hint';
    hint.textContent = currentHintText();
    target.appendChild(hint);

    const chunks = buildChunks(extractedText, settings.style);
    let currentPage = 1;
    chunks.forEach((chunk) => {
      if (chunk.type === 'page') {
        const parsedPage = Number(String(chunk.text || '').replace(/[^0-9]/g, ''));
        if (Number.isFinite(parsedPage) && parsedPage > 0) currentPage = parsedPage;
        const br = document.createElement('span');
        br.className = 'pageBreak';
        br.textContent = chunk.text;
        target.appendChild(br);
        return;
      }

      const span = document.createElement('span');
      span.className = 'unit kind-' + (chunk.kind || 'sentence') + (chunk.paragraphStart ? ' kind-paragraph-start' : '');
      span.textContent = chunk.displayText + (chunk.kind === 'heading' ? '' : ' ');
      span.dataset.index = textUnits.length;
      span.onclick = () => {
        currentIndex = Number(span.dataset.index);
        setCurrent(currentIndex);
        scrollToIndex(currentIndex);
      };
      target.appendChild(span);
      textUnits.push({
        text: chunk.speechText || chunk.displayText,
        displayText: chunk.displayText,
        span,
        kind: chunk.kind || 'sentence',
        paragraphEnd: !!chunk.paragraphEnd,
        page: currentPage
      });
    });

    setStatus(textUnits.length + ' spoken sections ready in ' + currentStyleLabel() + ' mode.');
  };

  setCurrent = function(i) {
    textUnits.forEach((unit) => unit.span.classList.remove('current'));
    if (textUnits[i]) {
      textUnits[i].span.classList.add('current');
      if (textUnits[i].page) {
        window.setOrbitPdfActivePage(textUnits[i].page, { scroll: false });
      }
    }
  };
})();
`;

const IOS_MARK_BRIDGE_JS = `
;(() => {
  if (!window.matchMedia || !window.matchMedia('(max-width: 700px)').matches) return;
  if (typeof DEFAULT_SETTINGS === 'object') {
    DEFAULT_SETTINGS.pdfInverted = true;
  }

  const getSelectedId = () => selectedId;
  const getCurrentIndex = () => currentIndex;

  function ensureInvertDefault() {
    if (!settings || settings.pdfInverted === true) return;
    settings.pdfInverted = true;
    storageSet({ settings });
    if (typeof applyInvertState === 'function') applyInvertState();
  }

  const originalLoadSettings = loadSettings;
  loadSettings = function() {
    originalLoadSettings();
    ensureInvertDefault();
  };

  const originalApplyDockState = applyDockState;
  applyDockState = function() {
    originalApplyDockState();
    syncDockMark();
  };

  const originalSetCurrent = setCurrent;
  setCurrent = function(index) {
    originalSetCurrent(index);
    syncDockMark();
  };

  const originalRenderTextPane = renderTextPane;
  renderTextPane = function(extractedText) {
    originalRenderTextPane(extractedText);
    syncDockMark();
  };

  const originalLoadPdf = loadPdf;
  loadPdf = async function(id) {
    const result = await originalLoadPdf(id);
    syncDockMark();
    return result;
  };

  window.addEventListener('pageshow', () => {
    ensureInvertDefault();
    syncDockMark();
  });

  function syncDockMark() {
    const mark = document.getElementById('dockMark') || markBtn;
    if (!mark) return;
    const hasPdf = !!getSelectedId();
    mark.disabled = !hasPdf;
    mark.classList.toggle('active', hasPdf);
    mark.setAttribute('aria-disabled', String(!hasPdf));
    mark.setAttribute('aria-label', hasPdf ? 'Mark resume point' : 'Select a PDF to mark');
  }
})();
`;

function patchedTextResponse(response, patch, contentType) {
  return response.text().then((text) => new Response(text + '\n' + patch, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    }
  }));
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/styles.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => patchedTextResponse(response, ORBIT_VIEWER_CSS, 'text/css'))
        .catch(() => caches.match(event.request).then((cached) => cached ? patchedTextResponse(cached, ORBIT_VIEWER_CSS, 'text/css') : undefined))
    );
    return;
  }

  if (url.pathname.endsWith('/app.js')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => patchedTextResponse(response, ORBIT_VIEWER_JS + '\n' + IOS_MARK_BRIDGE_JS, 'application/javascript'))
        .catch(() => caches.match(event.request).then((cached) => cached ? patchedTextResponse(cached, ORBIT_VIEWER_JS + '\n' + IOS_MARK_BRIDGE_JS, 'application/javascript') : undefined))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
