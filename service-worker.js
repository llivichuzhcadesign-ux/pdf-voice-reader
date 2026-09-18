const CACHE_NAME = 'orbit-pwa-v17';
const APP_SHELL = ['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./vendor/pdf.min.mjs','./vendor/pdf.worker.min.mjs'];
const LEGACY_SW_URL = 'https://raw.githubusercontent.com/llivichuzhcadesign-ux/pdf-voice-reader/b4f146a79e9bf4f7bd36fde5d70dade2dbd25b70/service-worker.js';

const ORBIT_LIBRARY_REFINEMENT_CSS = `
#library{isolation:isolate}.orbitLibraryActions{position:absolute;right:18px;top:18px;z-index:9;display:flex;align-items:center;gap:8px}.orbitLibraryCycle{height:40px;min-width:92px;padding:0 14px;border:1px solid rgba(255,255,255,.13);border-radius:999px;background:rgba(255,255,255,.055);color:#ececec;font-size:13px;font-weight:720;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.orbitLibraryAdd{position:relative}.orbitLibraryAdd summary{display:grid;place-items:center;width:40px;height:40px;border:1px solid rgba(255,255,255,.14);border-radius:50%;background:rgba(255,255,255,.06);color:#fff;cursor:pointer;font-size:25px;line-height:1;font-weight:340;list-style:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}.orbitLibraryAdd summary::-webkit-details-marker{display:none}.orbitLibraryAdd div{position:absolute;right:0;top:48px;z-index:20;display:grid;gap:6px;min-width:176px;padding:7px;border:1px solid rgba(255,255,255,.12);border-radius:16px;background:rgba(17,18,18,.94);box-shadow:0 18px 48px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(20px)}.orbitLibraryAdd label,.orbitLibraryAdd button{display:block;width:100%;min-height:38px;margin:0;padding:10px 12px;border:0;border-radius:11px;background:transparent;color:#fff;text-align:left;font-size:13px;font-weight:740;cursor:pointer}.orbitLibraryAdd label:hover,.orbitLibraryAdd button:hover{background:rgba(255,255,255,.1)}.orbitMobileLinkPanel{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin:0 0 10px;padding:8px;border:1px solid rgba(255,255,255,.1);border-radius:16px;background:rgba(255,255,255,.035)}.orbitMobileLinkPanel[hidden]{display:none!important}.orbitMobileLinkPanel input{min-width:0;border-radius:12px;background:#030303}.orbitMobileLinkPanel button{border-radius:12px;background:#fff;color:#000;border-color:#fff}.orbitLibraryToolbar{opacity:0!important;pointer-events:none!important}.orbitGalleryInfo h3{font-weight:680!important;letter-spacing:0!important;line-height:1.08!important}.orbitGalleryInfo p{font-weight:620!important;color:#929292!important}.orbitGalleryFeature{filter:drop-shadow(0 22px 58px rgba(255,255,255,.09)) drop-shadow(0 28px 48px rgba(0,0,0,.76))!important}.orbitBookCover.front{border-color:rgba(255,255,255,.16)!important;box-shadow:0 0 90px rgba(255,255,255,.13),0 24px 70px rgba(0,0,0,.76),inset 0 1px 0 rgba(255,255,255,.08),inset 8px 0 22px rgba(255,255,255,.035)!important}.orbitBookCover.front.marked{border-color:rgba(255,255,255,.18)!important;box-shadow:0 0 100px rgba(255,255,255,.15),0 24px 70px rgba(0,0,0,.76),inset 0 1px 0 rgba(255,255,255,.08),inset 8px 0 22px rgba(255,255,255,.035)!important}.orbitBookCover.front strong{display:none!important}.orbitBookCover.marked{border-color:rgba(255,255,255,.14)!important}.orbitBookCover[data-cover-ready='true'] .orbitBookArt{filter:grayscale(.62) contrast(1.05) brightness(.98)!important;opacity:.94!important}.orbitBookCover.rail[data-cover-ready='true'] .orbitBookArt{filter:grayscale(.75) contrast(1.05) brightness(.9)!important;opacity:.86!important}@media(min-width:701px){.orbitGalleryInfo h3{font-size:clamp(24px,2.45vw,38px)!important;max-width:780px}.orbitGallery{grid-template-columns:1fr!important;grid-template-areas:'info' 'stage' 'rail'!important;max-width:1240px;margin:0 auto}.orbitGalleryStage{min-height:min(50vh,500px)!important}.orbitGalleryInfo{text-align:center!important}.orbitGalleryRail{justify-content:center!important;gap:14px!important}.orbitBookCover{width:min(360px,29vw)!important;min-width:260px}.orbitBookCover.stack{width:min(320px,27vw)!important}.orbitBookCover.rail{width:132px!important;min-width:132px!important}}@media(max-width:1050px){body[data-mobile-view='library']{overflow:hidden!important}body[data-mobile-view='library'] main{display:none!important}body[data-mobile-view='library'] #library{display:block!important;width:100%!important;height:calc(100dvh - 96px - env(safe-area-inset-bottom))!important;overflow:hidden!important;padding:calc(14px + env(safe-area-inset-top)) 18px 112px!important;border:0!important;background:radial-gradient(circle at 50% 16%,rgba(255,255,255,.075),transparent 22rem),linear-gradient(180deg,#050505,#000 42%)!important}body[data-mobile-view='reader'] #library{display:none!important}body[data-mobile-view='reader'] main{display:flex!important}body[data-mobile-view='library'] #library>h1,body[data-mobile-view='library'] #library>.intro,body[data-mobile-view='library'] #library>.upload,body[data-mobile-view='library'] #library>.urlBox,body[data-mobile-view='library'] #installBox,body[data-mobile-view='library'] #status,body[data-mobile-view='library'] #library>h2{display:none!important}.orbitLibraryActions{right:18px;top:calc(14px + env(safe-area-inset-top))}.orbitGalleryList{height:calc(100% - 54px)!important;padding-top:52px!important;overflow:hidden!important}.orbitGallery{display:flex!important;flex-direction:column!important;height:100%!important;gap:10px!important}.orbitGalleryInfo{order:2;text-align:center!important;padding:0 6px!important}.orbitGalleryInfo h3{max-width:78vw;margin:0 auto 4px!important;font-size:clamp(17px,3vw,24px)!important;font-weight:680!important;line-height:1.12!important;color:#f1f1f1!important;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.orbitGalleryInfo p{display:block!important;margin:0!important;color:#929292!important;font-size:12px!important;font-weight:620!important}.orbitGalleryStage{order:1;flex:1 1 auto;min-height:0!important;width:100%;display:grid;place-items:center}.orbitGalleryStack{transform:translateX(-3vw)}.orbitBookCover{width:min(58vw,310px)!important;min-width:230px!important;border-radius:18px!important}.orbitBookCover.stack{width:min(54vw,288px)!important}.orbitGalleryStackCover{opacity:calc(.52 - (var(--stack-index) * .045))!important;transform:translateX(calc(var(--stack-index) * 23px)) translateY(calc(var(--stack-index) * 5px)) rotateY(calc(var(--stack-index) * -16deg)) rotateZ(calc(var(--stack-index) * 1.2deg)) scale(calc(1 - (var(--stack-index) * .052)))!important}.orbitGalleryRail{order:3;width:calc(100% + 36px);margin:0 -18px;justify-content:flex-start!important;gap:0!important;padding:12px 24px 18px!important;overflow-x:auto!important;scroll-snap-type:x mandatory;mask-image:linear-gradient(90deg,transparent,#000 28px,#000 calc(100% - 28px),transparent)!important}.orbitGalleryRailItem{scroll-snap-align:center;margin-right:-30px;opacity:.64!important;transform:scale(.92);transition:transform .18s ease,opacity .18s ease,filter .18s ease}.orbitGalleryRailItem.active,.orbitGalleryRailItem:hover,.orbitGalleryRailItem:focus{z-index:5;opacity:1!important;transform:translateY(-4px) scale(1)!important;filter:drop-shadow(0 14px 30px rgba(255,255,255,.09))}.orbitBookCover.rail{width:min(30vw,126px)!important;min-width:min(30vw,126px)!important;border-color:rgba(255,255,255,.12)!important}}
`;

const ORBIT_LIBRARY_REFINEMENT_JS = `
;(() => {
  const viewLabels = { gallery: 'Gallery', list: 'List', shelf: 'Shelf' };
  let refinedView = 'gallery';
  let railTimer = null;
  function qs(sel, root = document) { return root.querySelector(sel); }
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function activeToolbarButton() { return qs('.orbitLibraryViewBtn.active') || qs('.orbitLibraryViewBtn[data-view="gallery"]'); }
  function setCycleLabel() { const button = qs('.orbitLibraryCycle'); const active = activeToolbarButton(); refinedView = active?.dataset.view || refinedView || 'gallery'; if (button) button.textContent = viewLabels[refinedView] || 'Gallery'; }
  function ensureLibraryActions() {
    const library = qs('#library');
    if (!library) return;
    if (!qs('.orbitLibraryActions')) {
      const actions = document.createElement('div');
      actions.className = 'orbitLibraryActions';
      actions.innerHTML = '<button class="orbitLibraryCycle" type="button" aria-label="Change library view">Gallery</button><details class="orbitLibraryAdd"><summary aria-label="Add PDF">+</summary><div><label for="fileInput">Upload from files</label><button class="orbitLibraryLinkToggle" type="button">Link</button></div></details>';
      library.appendChild(actions);
      qs('.orbitLibraryCycle', actions)?.addEventListener('click', () => {
        const views = ['gallery', 'list', 'shelf'];
        const current = activeToolbarButton()?.dataset.view || refinedView || 'gallery';
        const next = views[(views.indexOf(current) + 1 + views.length) % views.length];
        qs('.orbitLibraryViewBtn[data-view="' + next + '"]')?.click();
        refinedView = next;
        setCycleLabel();
      });
      qs('.orbitLibraryLinkToggle', actions)?.addEventListener('click', () => {
        ensureMobileLinkPanel();
        const panel = qs('.orbitMobileLinkPanel');
        if (!panel) return;
        panel.hidden = !panel.hidden;
        if (!panel.hidden) qs('input', panel)?.focus();
        const menu = qs('.orbitLibraryAdd');
        if (menu) menu.open = false;
      });
    }
    setCycleLabel();
  }
  function ensureMobileLinkPanel() {
    const library = qs('#library');
    if (!library || qs('.orbitMobileLinkPanel')) return;
    const panel = document.createElement('div');
    panel.className = 'orbitMobileLinkPanel';
    panel.hidden = true;
    panel.innerHTML = '<input class="orbitMobileUrlInput" type="url" inputmode="url" autocomplete="off" autocapitalize="none" placeholder="Paste PDF URL"><button class="orbitMobileOpenUrl" type="button">Open link</button>';
    const list = qs('#pdfList');
    library.insertBefore(panel, list || null);
    const open = () => {
      const value = qs('.orbitMobileUrlInput', panel)?.value || '';
      const input = qs('#pdfUrlInput');
      if (input) input.value = value;
      qs('#openUrlBtn')?.click();
      panel.hidden = true;
    };
    qs('.orbitMobileOpenUrl', panel)?.addEventListener('click', open);
    qs('.orbitMobileUrlInput', panel)?.addEventListener('keydown', (event) => { if (event.key === 'Enter') open(); });
  }
  function syncFeaturedFromRail(rail) {
    const buttons = qsa('.orbitGalleryRailItem', rail);
    if (!buttons.length) return;
    const rect = rail.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    let closest = buttons[0];
    let distance = Infinity;
    buttons.forEach((button) => {
      const itemRect = button.getBoundingClientRect();
      const nextDistance = Math.abs(itemRect.left + itemRect.width / 2 - center);
      if (nextDistance < distance) { closest = button; distance = nextDistance; }
    });
    if (closest && typeof closest.onfocus === 'function') closest.onfocus();
  }
  function refineGallery() {
    const gallery = qs('.orbitGallery');
    if (!gallery) return;
    const rail = qs('.orbitGalleryRail', gallery);
    if (rail && !rail.dataset.refinedScroll) {
      rail.dataset.refinedScroll = 'true';
      rail.addEventListener('scroll', () => {
        clearTimeout(railTimer);
        railTimer = setTimeout(() => syncFeaturedFromRail(rail), 80);
      }, { passive: true });
    }
  }
  const previousRenderList = renderList;
  renderList = async function(...args) {
    const result = await previousRenderList.apply(this, args);
    ensureLibraryActions();
    ensureMobileLinkPanel();
    setCycleLabel();
    refineGallery();
    return result;
  };
  window.addEventListener('pageshow', () => { ensureLibraryActions(); ensureMobileLinkPanel(); setCycleLabel(); refineGallery(); });
})();
`;

const ORBIT_LIBRARY_COVERFLOW_CSS = `
.orbitGalleryRailItem{will-change:transform,opacity}.orbitGalleryRail{overscroll-behavior-x:contain}.orbitBookCover.rail{-webkit-box-reflect:below 10px linear-gradient(transparent 58%,rgba(0,0,0,.34));transform-style:preserve-3d}.orbitBookCover.rail .orbitBookSource{font-size:9px!important;opacity:.84}.orbitBookCover.rail .orbitBookProgress{font-size:9px!important;line-height:1.15!important;color:rgba(255,255,255,.72)!important}.orbitBookCover.rail strong{display:block!important;position:absolute!important;left:12px!important;right:10px!important;bottom:32px!important;margin:0!important;font-size:11px!important;line-height:1.06!important;font-weight:720!important;letter-spacing:0!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.orbitBookCover.rail::before{background:linear-gradient(180deg,rgba(255,255,255,.18),transparent 24%),linear-gradient(130deg,transparent 0 42%,rgba(255,255,255,.08) 44%,transparent 50%)!important}.orbitBookCover.rail::after{border-color:rgba(255,255,255,.08)!important}@media(max-width:1050px){body[data-mobile-view='library'] #library{background:radial-gradient(circle at 50% 18%,rgba(255,255,255,.08),transparent 22rem),linear-gradient(180deg,#111 0,#050505 28%,#000 100%)!important}.orbitGalleryList{padding-top:48px!important}.orbitGallery{justify-content:center!important}.orbitGalleryStage{display:none!important}.orbitGalleryInfo{order:2!important;margin-top:2px!important;min-height:52px!important}.orbitGalleryInfo h3{font-size:clamp(17px,4.8vw,23px)!important;font-weight:650!important}.orbitGalleryRail{order:1!important;position:relative!important;height:min(55dvh,520px)!important;min-height:330px!important;width:calc(100% + 36px)!important;margin:0 -18px!important;padding:42px 43vw 96px!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:0!important;overflow-x:auto!important;overflow-y:visible!important;scroll-snap-type:x mandatory!important;perspective:1100px!important;mask-image:none!important}.orbitGalleryRail::before{content:'';position:absolute;left:8%;right:8%;bottom:76px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent);pointer-events:none}.orbitGalleryRail::after{content:'';position:absolute;left:12%;right:12%;bottom:34px;height:70px;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,.11),transparent 68%);filter:blur(14px);opacity:.75;pointer-events:none}.orbitGalleryRailItem{position:relative!important;z-index:1;flex:0 0 clamp(136px,42vw,224px)!important;margin:0 -32px!important;scroll-snap-align:center!important;transform-origin:center bottom!important;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .22s ease,filter .22s ease!important}.orbitGalleryRailItem[data-orbit-offset='0']{z-index:9!important;opacity:1!important;filter:drop-shadow(0 24px 42px rgba(0,0,0,.72)) drop-shadow(0 0 42px rgba(255,255,255,.12))!important;transform:translateY(-18px) translateZ(80px) scale(1.08)!important}.orbitGalleryRailItem[data-orbit-offset='-1']{z-index:7!important;opacity:.86!important;transform:translateX(18px) translateY(3px) rotateY(25deg) scale(.92)!important}.orbitGalleryRailItem[data-orbit-offset='1']{z-index:7!important;opacity:.86!important;transform:translateX(-18px) translateY(3px) rotateY(-25deg) scale(.92)!important}.orbitGalleryRailItem[data-orbit-offset='-2']{z-index:5!important;opacity:.64!important;transform:translateX(34px) translateY(16px) rotateY(36deg) scale(.79)!important}.orbitGalleryRailItem[data-orbit-offset='2']{z-index:5!important;opacity:.64!important;transform:translateX(-34px) translateY(16px) rotateY(-36deg) scale(.79)!important}.orbitGalleryRailItem[data-orbit-offset='-3'],.orbitGalleryRailItem[data-orbit-offset='3']{z-index:3!important;opacity:.42!important;filter:blur(.2px)!important;transform:translateY(25px) scale(.68)!important}.orbitGalleryRailItem[data-orbit-offset='far']{z-index:1!important;opacity:.25!important;transform:translateY(32px) scale(.58)!important}.orbitBookCover.rail{width:clamp(136px,42vw,224px)!important;min-width:clamp(136px,42vw,224px)!important;border-radius:16px!important;padding:14px 12px 12px 16px!important;border-color:rgba(255,255,255,.16)!important;box-shadow:0 18px 46px rgba(0,0,0,.62),inset 0 1px 0 rgba(255,255,255,.08),inset 8px 0 22px rgba(255,255,255,.04)!important}.orbitBookCover.rail[data-cover-ready='true'] .orbitBookArt{inset:12px 10px 42px 15px!important;border-radius:11px!important;opacity:.95!important;filter:grayscale(.42) contrast(1.04) brightness(.96)!important}.orbitGalleryRailItem[data-orbit-offset='0'] .orbitBookCover.rail{border-color:rgba(255,255,255,.24)!important;box-shadow:0 0 80px rgba(255,255,255,.16),0 24px 58px rgba(0,0,0,.75),inset 0 1px 0 rgba(255,255,255,.1)!important}.orbitGalleryRailItem[data-orbit-offset='0'] .orbitBookCover.rail strong{font-weight:780!important;color:#fff!important}.orbitGalleryRailItem:not([data-orbit-offset='0']) .orbitBookCover.rail strong{color:rgba(255,255,255,.76)!important}.orbitBookCover.rail.marked{border-color:rgba(255,255,255,.16)!important}.orbitBookProgress b{flex:0 0 auto!important}}@media(min-width:1051px){.orbitGalleryRail{position:relative!important;min-height:260px!important;align-items:center!important;justify-content:center!important;overflow:visible!important;perspective:1200px!important;mask-image:none!important}.orbitGalleryRailItem{margin:0 -22px!important;transform-origin:center bottom!important}.orbitGalleryRailItem[data-orbit-offset='0']{z-index:9!important;opacity:1!important;transform:translateY(-12px) scale(1.08)!important;filter:drop-shadow(0 22px 44px rgba(255,255,255,.09))}.orbitGalleryRailItem[data-orbit-offset='-1']{z-index:7!important;opacity:.84!important;transform:translateX(10px) rotateY(18deg) scale(.93)!important}.orbitGalleryRailItem[data-orbit-offset='1']{z-index:7!important;opacity:.84!important;transform:translateX(-10px) rotateY(-18deg) scale(.93)!important}.orbitGalleryRailItem[data-orbit-offset='-2'],.orbitGalleryRailItem[data-orbit-offset='2']{z-index:5!important;opacity:.58!important;transform:translateY(10px) scale(.82)!important}.orbitGalleryRailItem[data-orbit-offset='far']{opacity:.32!important;transform:translateY(16px) scale(.72)!important}.orbitBookCover.rail{width:150px!important;min-width:150px!important;border-radius:14px!important}.orbitBookCover.rail[data-cover-ready='true'] .orbitBookArt{filter:grayscale(.5) contrast(1.04) brightness(.94)!important;opacity:.94!important}}\n`;

const ORBIT_LIBRARY_COVERFLOW_JS = `
;(() => {
  function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  function activeIndex(items) {
    const found = items.findIndex((item) => item.classList.contains('active'));
    return found >= 0 ? found : 0;
  }
  function applyCoverflow(root = document) {
    qsa('.orbitGallery').forEach((gallery) => {
      const items = qsa('.orbitGalleryRailItem', gallery);
      if (!items.length) return;
      const current = activeIndex(items);
      items.forEach((item, index) => {
        const raw = index - current;
        const offset = Math.abs(raw) > 3 ? 'far' : String(raw);
        item.dataset.orbitOffset = offset;
        if (!item.dataset.coverflowBound) {
          item.dataset.coverflowBound = 'true';
          item.addEventListener('pointerenter', () => requestAnimationFrame(() => applyCoverflow(gallery)));
          item.addEventListener('focus', () => requestAnimationFrame(() => applyCoverflow(gallery)));
          item.addEventListener('click', () => requestAnimationFrame(() => applyCoverflow(gallery)));
        }
      });
      const rail = gallery.querySelector('.orbitGalleryRail');
      if (rail && !rail.dataset.coverflowCentered) {
        rail.dataset.coverflowCentered = 'true';
        requestAnimationFrame(() => items[current]?.scrollIntoView({ block: 'nearest', inline: 'center' }));
      }
    });
  }
  const previousRenderList = renderList;
  renderList = async function(...args) {
    const result = await previousRenderList.apply(this, args);
    applyCoverflow();
    return result;
  };
  document.addEventListener('scroll', () => requestAnimationFrame(() => applyCoverflow()), true);
  window.addEventListener('pageshow', () => applyCoverflow());
  window.addEventListener('resize', () => applyCoverflow());
})();\n`;

let legacyPatchPromise;
function extractLegacyConstant(source, name) {
  const pattern = new RegExp('const\\s+' + name + '\\s*=\\s*`([\\s\\S]*?)`;');
  const match = source.match(pattern);
  return match ? match[1] : '';
}
function loadLegacyPatches() {
  if (!legacyPatchPromise) {
    legacyPatchPromise = fetch(LEGACY_SW_URL, { cache: 'no-store' })
      .then((response) => response.ok ? response.text() : '')
      .then((source) => ({
        css: [extractLegacyConstant(source, 'ORBIT_VIEWER_CSS'), extractLegacyConstant(source, 'LIBRARY_GALLERY_CSS')].filter(Boolean).join('\n') + '\n' + ORBIT_LIBRARY_REFINEMENT_CSS + '\n' + ORBIT_LIBRARY_COVERFLOW_CSS,
        js: [extractLegacyConstant(source, 'ORBIT_VIEWER_JS'), extractLegacyConstant(source, 'LIBRARY_GALLERY_JS'), extractLegacyConstant(source, 'IOS_MARK_BRIDGE_JS')].filter(Boolean).join('\n') + '\n' + ORBIT_LIBRARY_REFINEMENT_JS + '\n' + ORBIT_LIBRARY_COVERFLOW_JS
      }))
      .catch(() => ({ css: ORBIT_LIBRARY_REFINEMENT_CSS + '\n' + ORBIT_LIBRARY_COVERFLOW_CSS, js: ORBIT_LIBRARY_REFINEMENT_JS + '\n' + ORBIT_LIBRARY_COVERFLOW_JS }));
  }
  return legacyPatchPromise;
}
function patchedTextResponse(response, patch, contentType) {
  return response.text().then((text) => new Response(text + '\n' + patch, { headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store' } }));
}
self.addEventListener('install', (event) => { self.skipWaiting(); event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/styles.css')) {
    event.respondWith(loadLegacyPatches().then((patches) => fetch(event.request).then((response) => patchedTextResponse(response, patches.css, 'text/css')).catch(() => caches.match(event.request).then((cached) => cached ? patchedTextResponse(cached, patches.css, 'text/css') : undefined))));
    return;
  }
  if (url.pathname.endsWith('/app.js')) {
    event.respondWith(loadLegacyPatches().then((patches) => fetch(event.request).then((response) => patchedTextResponse(response, patches.js, 'application/javascript')).catch(() => caches.match(event.request).then((cached) => cached ? patchedTextResponse(cached, patches.js, 'application/javascript') : undefined))));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => { const copy = response.clone(); caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)); return response; }).catch(() => caches.match('./index.html'));
  }));
});
