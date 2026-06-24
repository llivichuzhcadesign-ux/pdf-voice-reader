import * as pdfjsLib from './vendor/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdf.worker.min.mjs', import.meta.url).toString();

const DB_NAME = 'pdfVoiceReaderDB';
const STORE = 'pdfs';
const SETTINGS_KEY = 'readerSettings';

const DEFAULT_SETTINGS = {
  pdfInverted: false,
  style: 'smooth',
  preset: 'podcast',
  rate: 0.92,
  pitch: 1.0,
  sentencePause: 450,
  paragraphPause: 900,
  headingPause: 1200,
  voiceURI: '',
  voiceMode: 'browser',
  elevenApiKey: '',
  elevenVoiceId: '',
  elevenModelId: 'eleven_multilingual_v2',
  elevenStability: 0.50,
  elevenSimilarity: 0.75
};

const PRESETS = {
  clear: { rate: 0.96, pitch: 1.0, sentencePause: 350, paragraphPause: 700, headingPause: 900 },
  soft: { rate: 0.88, pitch: 0.95, sentencePause: 550, paragraphPause: 1050, headingPause: 1350 },
  podcast: { rate: 0.92, pitch: 1.02, sentencePause: 450, paragraphPause: 900, headingPause: 1200 },
  slowStudy: { rate: 0.78, pitch: 1.0, sentencePause: 700, paragraphPause: 1350, headingPause: 1700 }
};

let db;
let currentPdfId = null;
let currentRawText = '';
let currentPdfName = '';
let currentPdfUrl = '';
let textUnits = [];
let currentIndex = 0;
let voices = [];
let activeObjectUrl = null;
let settings = { ...DEFAULT_SETTINGS };
let reading = false;
let manuallyPaused = false;
let readingToken = 0;
let delayTimer = null;
let currentAudio = null;
let audioCache = new Map();
let testAudio = null;

const $ = (id) => document.getElementById(id);

function setStatus(msg) {
  $('status').textContent = msg || '';
}

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>\"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;'
  }[c]));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(mode = 'readonly') {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function putPdf(record) {
  return new Promise((res, rej) => {
    const r = tx('readwrite').put(record);
    r.onsuccess = res;
    r.onerror = () => rej(r.error);
  });
}

function getPdf(id) {
  return new Promise((res, rej) => {
    const r = tx().get(id);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function getAllPdfs() {
  return new Promise((res, rej) => {
    const r = tx().getAll();
    r.onsuccess = () => res(r.result || []);
    r.onerror = () => rej(r.error);
  });
}

function deletePdf(id) {
  return new Promise((res, rej) => {
    const r = tx('readwrite').delete(id);
    r.onsuccess = res;
    r.onerror = () => rej(r.error);
  });
}

function storageGet(key) {
  try {
    const raw = localStorage.getItem(key);
    return Promise.resolve(raw ? JSON.parse(raw) : undefined);
  } catch {
    return Promise.resolve(undefined);
  }
}

function storageSet(obj) {
  for (const [key, value] of Object.entries(obj)) {
    localStorage.setItem(key, JSON.stringify(value));
  }
  return Promise.resolve();
}

function progressKey(id) {
  return `progress_${id}`;
}

async function loadSettings() {
  const saved = await storageGet(SETTINGS_KEY) || {};
  settings = { ...DEFAULT_SETTINGS, ...saved };
  applySettingsToControls();
  applyInvertState();
}

async function saveSettings() {
  readControlsIntoSettings();
  await storageSet({ [SETTINGS_KEY]: settings });
}

function readControlsIntoSettings() {
  settings.pdfInverted = !!settings.pdfInverted;
  settings.style = $('styleSelect')?.value || settings.style;
  settings.preset = $('presetSelect')?.value || settings.preset;
  settings.rate = parseFloat($('rate')?.value || settings.rate || DEFAULT_SETTINGS.rate);
  settings.pitch = parseFloat($('pitch')?.value || settings.pitch || DEFAULT_SETTINGS.pitch);
  settings.sentencePause = parseInt($('sentencePause')?.value || settings.sentencePause || DEFAULT_SETTINGS.sentencePause, 10);
  settings.paragraphPause = parseInt($('paragraphPause')?.value || settings.paragraphPause || DEFAULT_SETTINGS.paragraphPause, 10);
  settings.headingPause = parseInt($('headingPause')?.value || settings.headingPause || DEFAULT_SETTINGS.headingPause, 10);
  settings.voiceURI = $('voiceSelect')?.value || settings.voiceURI || '';
  settings.voiceMode = $('voiceModeSelect')?.value || settings.voiceMode || 'browser';
  settings.elevenApiKey = $('elevenApiKey')?.value.trim() || settings.elevenApiKey || '';
  settings.elevenVoiceId = $('elevenVoiceId')?.value.trim() || settings.elevenVoiceId || '';
  settings.elevenModelId = $('elevenModelId')?.value || settings.elevenModelId || 'eleven_multilingual_v2';
  settings.elevenStability = parseFloat($('elevenStability')?.value || settings.elevenStability || 0.50);
  settings.elevenSimilarity = parseFloat($('elevenSimilarity')?.value || settings.elevenSimilarity || 0.75);
}

function applySettingsToControls() {
  if ($('styleSelect')) $('styleSelect').value = settings.style;
  if ($('presetSelect')) $('presetSelect').value = settings.preset;
  if ($('rate')) $('rate').value = String(settings.rate);
  if ($('pitch')) $('pitch').value = String(settings.pitch);
  if ($('sentencePause')) $('sentencePause').value = String(settings.sentencePause);
  if ($('paragraphPause')) $('paragraphPause').value = String(settings.paragraphPause);
  if ($('headingPause')) $('headingPause').value = String(settings.headingPause);
  if ($('voiceModeSelect')) $('voiceModeSelect').value = settings.voiceMode || 'browser';
  if ($('elevenApiKey')) $('elevenApiKey').value = settings.elevenApiKey || '';
  if ($('elevenVoiceId')) $('elevenVoiceId').value = settings.elevenVoiceId || '';
  if ($('elevenModelId')) $('elevenModelId').value = settings.elevenModelId || 'eleven_multilingual_v2';
  if ($('elevenStability')) $('elevenStability').value = String(settings.elevenStability ?? 0.50);
  if ($('elevenSimilarity')) $('elevenSimilarity').value = String(settings.elevenSimilarity ?? 0.75);
  updateVoiceModeUI();
  updateValueLabels();
}

function updateValueLabels() {
  if ($('rateValue')) $('rateValue').textContent = Number($('rate').value).toFixed(2);
  if ($('pitchValue')) $('pitchValue').textContent = Number($('pitch').value).toFixed(2);
  if ($('sentencePauseValue')) $('sentencePauseValue').textContent = `${$('sentencePause').value}ms`;
  if ($('paragraphPauseValue')) $('paragraphPauseValue').textContent = `${$('paragraphPause').value}ms`;
  if ($('headingPauseValue')) $('headingPauseValue').textContent = `${$('headingPause').value}ms`;
  if ($('elevenStabilityValue')) $('elevenStabilityValue').textContent = Number($('elevenStability').value).toFixed(2);
  if ($('elevenSimilarityValue')) $('elevenSimilarityValue').textContent = Number($('elevenSimilarity').value).toFixed(2);
}

function updateVoiceModeUI() {
  const isAi = ($('voiceModeSelect')?.value || settings.voiceMode) === 'elevenlabs';
  document.body.classList.toggle('ai-mode', isAi);
  const panel = $('aiControls');
  if (panel) {
    if (isAi) panel.removeAttribute('hidden');
    else panel.setAttribute('hidden', '');
  }
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  $('rate').value = String(preset.rate);
  $('pitch').value = String(preset.pitch);
  $('sentencePause').value = String(preset.sentencePause);
  $('paragraphPause').value = String(preset.paragraphPause);
  $('headingPause').value = String(preset.headingPause);
  updateValueLabels();
}

function applyInvertState() {
  const btn = $('invertBtn');
  if (btn) {
    btn.textContent = `Invert PDF: ${settings.pdfInverted ? 'On' : 'Off'}`;
    btn.setAttribute('aria-pressed', String(settings.pdfInverted));
  }
  document.querySelectorAll('.pdfEmbed').forEach(el => el.classList.toggle('inverted', settings.pdfInverted));
}

async function renderList() {
  const list = $('pdfList');
  list.innerHTML = '';
  const items = (await getAllPdfs()).sort((a, b) => b.addedAt - a.addedAt);
  if (!items.length) {
    list.innerHTML = '<div class="empty">No PDFs saved yet.</div>';
    return;
  }

  for (const item of items) {
    const p = await storageGet(progressKey(item.id));
    const div = document.createElement('div');
    div.className = 'pdfItem' + (item.id === currentPdfId ? ' active' : '');
    const sourceHost = item.sourceUrl ? safeHost(item.sourceUrl) : '';
    div.innerHTML = `
      <button class="delete" title="Delete">×</button>
      <strong>${escapeHtml(item.name)}</strong>
      <small>${p ? `Last read: section ${p.index || 0}` : 'Not started'}</small>
      ${item.sourceUrl ? `<span class="sourcePill">Online PDF</span><small class="sourceLink" title="${escapeHtml(item.sourceUrl)}">${escapeHtml(sourceHost || item.sourceUrl)}</small>` : `<span class="sourcePill">Local PDF</span>`}
    `;
    div.onclick = (e) => {
      if (e.target.className === 'delete') return;
      loadPdf(item.id);
    };
    div.querySelector('.delete').onclick = async (e) => {
      e.stopPropagation();
      await deletePdf(item.id);
      localStorage.removeItem(progressKey(item.id));
      if (currentPdfId === item.id) resetViewer();
      renderList();
    };
    list.appendChild(div);
  }
}

function resetViewer() {
  stopReading();
  currentPdfId = null;
  currentRawText = '';
  currentPdfName = '';
  currentPdfUrl = '';
  textUnits = [];
  currentIndex = 0;
  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }
  $('viewer').innerHTML = '';
  $('docTitle').textContent = 'No PDF selected';
}

async function addFiles(files) {
  let count = 0;
  for (const file of files) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) continue;
    const buffer = await file.arrayBuffer();
    await putPdf({ id: uuid(), name: file.name, addedAt: Date.now(), buffer });
    count++;
  }
  setStatus(count ? `${count} PDF${count === 1 ? '' : 's'} saved.` : 'No PDF file selected.');
  await renderList();
}

function normalizeIncomingPdfUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) throw new Error('Paste a PDF link first.');
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try { url = new URL(value); } catch (_) { throw new Error('This does not look like a valid URL.'); }

  // Google often wraps results in /url?q=... or /url?url=... links.
  if (url.hostname.endsWith('google.com') && url.pathname === '/url') {
    const nested = url.searchParams.get('url') || url.searchParams.get('q');
    if (nested) return normalizeIncomingPdfUrl(nested);
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error('Only http and https links are supported.');
  url.hash = '';
  return url.href;
}

function safeHost(rawUrl) {
  try { return new URL(rawUrl).hostname.replace(/^www\./, ''); } catch (_) { return ''; }
}

function sameSourceUrl(a, b) {
  try {
    const ua = new URL(a); const ub = new URL(b);
    ua.hash = ''; ub.hash = '';
    return ua.href === ub.href;
  } catch (_) {
    return a === b;
  }
}

function filenameFromContentDisposition(header) {
  if (!header) return '';
  const star = header.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) {
    try { return decodeURIComponent(star[1].replace(/^"|"$/g, '')); } catch (_) {}
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : '';
}

function filenameFromUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || 'Online PDF');
    return last || 'Online PDF';
  } catch (_) {
    return 'Online PDF';
  }
}

function ensurePdfFilename(name) {
  let clean = String(name || 'Online PDF')
    .replace(/[\x00-\x1F<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'Online PDF';
  if (!/\.pdf$/i.test(clean)) clean += '.pdf';
  return clean;
}

async function addPdfFromUrl(rawUrl, options = {}) {
  const button = $('openUrlBtn');
  const originalButtonText = button?.textContent || '';
  try {
    const sourceUrl = normalizeIncomingPdfUrl(rawUrl);
    if ($('pdfUrlInput')) $('pdfUrlInput').value = sourceUrl;

    const existing = (await getAllPdfs()).find(item => item.sourceUrl && sameSourceUrl(item.sourceUrl, sourceUrl));
    if (existing && !options.forceRefresh) {
      setStatus('This online PDF is already saved. Opening your saved copy.');
      await loadPdf(existing.id);
      return existing.id;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Fetching...';
    }
    setStatus(`Fetching PDF from ${safeHost(sourceUrl) || 'the web'}...`);

    const response = await fetch(sourceUrl, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });

    if (!response.ok) throw new Error(`The site returned ${response.status} ${response.statusText || ''}`.trim());

    const contentType = response.headers.get('content-type') || '';
    const disposition = response.headers.get('content-disposition') || '';
    const buffer = await response.arrayBuffer();
    const signature = String.fromCharCode(...new Uint8Array(buffer.slice(0, 5)));
    const looksLikePdf = signature === '%PDF-' || /application\/pdf/i.test(contentType) || /\.pdf(?:[?#]|$)/i.test(sourceUrl);
    if (!looksLikePdf) {
      throw new Error('This link did not return a PDF file. It may be a web page, blocked download, or login-only file.');
    }

    const providedName = options.name || '';
    const name = ensurePdfFilename(filenameFromContentDisposition(disposition) || providedName || filenameFromUrl(sourceUrl));
    const id = uuid();
    await putPdf({
      id,
      name,
      addedAt: Date.now(),
      buffer,
      sourceUrl,
      sourceHost: safeHost(sourceUrl),
      addedFrom: options.addedFrom || 'url'
    });

    setStatus(`Saved online PDF: ${name}`);
    await renderList();
    await loadPdf(id);
    return id;
  } catch (err) {
    console.error(err);
    setStatus(`Could not open online PDF: ${err.message || err}`);
    return null;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalButtonText || 'Open & Save Link';
    }
  }
}

async function openUrlFromInput() {
  const url = $('pdfUrlInput')?.value || '';
  await addPdfFromUrl(url, { addedFrom: 'manual-url' });
}

async function loadPdf(id) {
  stopReading();
  currentPdfId = id;
  currentRawText = '';
  currentPdfName = '';
  currentPdfUrl = '';
  textUnits = [];
  currentIndex = 0;
  $('viewer').innerHTML = '<div class="loading">Loading PDF text...</div>';

  if (activeObjectUrl) {
    URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = null;
  }

  const rec = await getPdf(id);
  if (!rec) {
    resetViewer();
    return;
  }

  $('docTitle').textContent = rec.name;
  const blob = new Blob([rec.buffer], { type: 'application/pdf' });
  activeObjectUrl = URL.createObjectURL(blob);

  let text = '';
  try {
    text = await extractPdfText(rec.buffer);
  } catch (err) {
    console.error(err);
    text = '';
    setStatus('PDF loaded, but text extraction failed.');
  }

  currentRawText = text;
  currentPdfName = rec.name;
  currentPdfUrl = activeObjectUrl;
  renderReader(rec.name, activeObjectUrl, text);
  const p = await storageGet(progressKey(id));
  if (p && Number.isInteger(p.index)) {
    currentIndex = Math.min(p.index, Math.max(0, textUnits.length - 1));
    markReadThrough(currentIndex - 1);
    scrollToIndex(currentIndex);
  }
  await renderList();
}

function renderReader(name, pdfUrl, extractedText) {
  $('viewer').innerHTML = '';
  const grid = document.createElement('div');
  grid.className = 'readerGrid';
  grid.innerHTML = `
    <div class="pdfPreview">
      <h3>PDF preview</h3>
      <iframe class="pdfEmbed${settings.pdfInverted ? ' inverted' : ''}" src="${pdfUrl}" title="${escapeHtml(name)}"></iframe>
    </div>
    <div class="textReader">
      <h3>Read-aloud text <span id="modeBadge" class="modeBadge"></span></h3>
      <div class="textContent" id="textContent"></div>
    </div>`;
  $('viewer').appendChild(grid);
  renderTextPane(extractedText);
}

function renderTextPane(extractedText) {
  textUnits = [];
  const target = $('textContent');
  if (!target) return;
  target.innerHTML = '';

  if (!extractedText.trim()) {
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
  chunks.forEach((chunk) => {
    if (chunk.type === 'page') {
      const br = document.createElement('span');
      br.className = 'pageBreak';
      br.textContent = chunk.text;
      target.appendChild(br);
      return;
    }

    const span = document.createElement('span');
    span.className = `unit kind-${chunk.kind || 'sentence'}${chunk.paragraphStart ? ' kind-paragraph-start' : ''}`;
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
      paragraphEnd: !!chunk.paragraphEnd
    });
  });

  setStatus(`${textUnits.length} spoken sections ready in ${currentStyleLabel()} mode.`);
}

function currentStyleLabel() {
  const value = $('styleSelect')?.value || settings.style;
  return ({ exact: 'Exact', smooth: 'Smooth', podcast: 'Podcast', study: 'Study' })[value] || 'Smooth';
}

function currentHintText() {
  switch (($('styleSelect')?.value || settings.style)) {
    case 'exact': return 'Exact mode keeps the PDF wording closest to the original and only fixes basic spacing.';
    case 'podcast': return 'Podcast mode lightly rewrites terms, dashes, and slash-separated choices so the voice sounds more like a narrator.';
    case 'study': return 'Study mode reads terms as structured study cards with longer pauses between ideas.';
    default: return 'Smooth mode cleans line breaks, hyphenated words, spacing, headings, and sentence rhythm before reading.';
  }
}

function buildChunks(text, style) {
  const source = normalizeSourceText(text, style);
  const chunks = [];
  const parts = source.split(/(--- Page \d+ ---)/g);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (/^--- Page \d+ ---$/.test(trimmed)) {
      chunks.push({ type: 'page', text: trimmed.replace(/---/g, '').trim() });
      continue;
    }

    const blocks = makeReadableBlocks(trimmed);
    blocks.forEach((block) => {
      if (block.kind === 'heading') {
        chunks.push({
          type: 'text',
          kind: 'heading',
          displayText: block.text,
          speechText: transformForSpeech(block.text, 'heading', style),
          paragraphStart: true,
          paragraphEnd: true
        });
        return;
      }

      const sentences = splitIntoSentences(block.text);
      sentences.forEach((sentence, idx) => {
        const displayText = cleanDisplaySentence(sentence);
        if (!displayText) return;
        const term = parseGlossarySentence(displayText);
        const kind = term ? 'term' : 'sentence';
        chunks.push({
          type: 'text',
          kind,
          displayText,
          speechText: transformForSpeech(displayText, kind, style),
          paragraphStart: idx === 0,
          paragraphEnd: idx === sentences.length - 1
        });
      });
    });
  }

  return chunks;
}

function normalizeSourceText(text, style) {
  let s = String(text || '')
    .replace(/\r/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/([A-Za-z])\s*-\s*\n\s*([a-z])/g, '$1$2')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (style !== 'exact') {
    s = removeLikelyRepeatedLines(s);
  }

  return s;
}

function removeLikelyRepeatedLines(text) {
  const pages = text.split(/--- Page \d+ ---/g);
  if (pages.length < 3) return text;
  const counts = new Map();
  pages.forEach(page => {
    const seen = new Set();
    page.split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
      if (line.length > 90) return;
      if (/^\d+$/.test(line)) return;
      seen.add(line.toLowerCase());
    });
    seen.forEach(line => counts.set(line, (counts.get(line) || 0) + 1));
  });
  const repeated = new Set([...counts.entries()].filter(([, count]) => count >= Math.max(3, Math.ceil(pages.length * 0.55))).map(([line]) => line));
  if (!repeated.size) return text;
  return text.split('\n').filter(line => !repeated.has(line.trim().toLowerCase())).join('\n');
}

function makeReadableBlocks(sectionText) {
  const paragraphs = [];
  const rawParts = sectionText.split(/\n\s*\n/g);

  for (const raw of rawParts) {
    const lines = raw.split('\n').map(cleanLine).filter(Boolean).filter(l => !isJunkLine(l));
    if (!lines.length) continue;

    let buffer = [];
    let bufferKind = 'paragraph';
    const flush = () => {
      const text = buffer.join(' ').replace(/\s+/g, ' ').trim();
      if (text) paragraphs.push({ kind: bufferKind, text });
      buffer = [];
      bufferKind = 'paragraph';
    };

    for (const line of lines) {
      if (isLikelyHeading(line)) {
        flush();
        paragraphs.push({ kind: 'heading', text: line.replace(/:$/, '') });
        continue;
      }

      if (isGlossaryLine(line) && buffer.length) {
        flush();
      }

      buffer.push(line);

      const joined = buffer.join(' ');
      const endsStrongly = /[.!?]["')\]]?$/.test(line);
      const longEnough = joined.length > 220;
      const nextShouldBreathe = isGlossaryLine(line) || longEnough;
      if (endsStrongly && nextShouldBreathe) flush();
    }
    flush();
  }

  return paragraphs;
}

function cleanLine(line) {
  return String(line || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .trim();
}

function isJunkLine(line) {
  const s = line.trim();
  return /^\d+$/.test(s) || /^page\s+\d+$/i.test(s) || /^©\s*/.test(s);
}

function isLikelyHeading(line) {
  const s = line.trim();
  if (!s || s.length > 120) return false;
  if (/^[-–—•]/.test(s)) return false;
  if (/[.!?]$/.test(s)) return false;
  if (/^--- Page \d+ ---$/.test(s)) return true;
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (letters.length >= 6) {
    const uppercase = letters.replace(/[^A-Z]/g, '').length / letters.length;
    if (uppercase > 0.72) return true;
  }
  if (/^(chapter|section|part|lesson|unit|module|terms|vocabulary|summary|introduction|conclusion)\b/i.test(s)) return true;
  return false;
}

function isGlossaryLine(line) {
  return !!parseGlossarySentence(line);
}

function parseGlossarySentence(text) {
  const s = text.trim();
  if (s.length > 180) return null;
  const m = s.match(/^([^—–-]{2,70}?)\s+[—–-]\s+(.{2,110}?)(?:\.|:|;)?$/);
  if (!m) return null;
  const left = m[1].trim();
  const right = m[2].trim();
  if (!left || !right) return null;
  if (left.split(/\s+/).length > 8) return null;
  return { term: left, translation: right };
}

function cleanDisplaySentence(sentence) {
  return String(sentence || '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();
}

function splitIntoSentences(text) {
  const protectedText = protectAbbreviations(text);
  const pieces = protectedText.match(/[^.!?]+(?:[.!?]+["')\]]*)+|[^.!?]+$/g) || [protectedText];
  return pieces.map(unprotectAbbreviations).map(s => s.trim()).filter(Boolean);
}

const ABBR = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.', 'U.S.', 'U.K.', 'e.g.', 'i.e.', 'etc.', 'vs.', 'No.'];
function protectAbbreviations(text) {
  let s = text;
  ABBR.forEach((abbr, i) => {
    const token = `__ABBR_${i}__`;
    s = s.split(abbr).join(token);
  });
  return s;
}
function unprotectAbbreviations(text) {
  let s = text;
  ABBR.forEach((abbr, i) => {
    s = s.split(`__ABBR_${i}__`).join(abbr);
  });
  return s;
}

function transformForSpeech(text, kind, style) {
  const original = cleanDisplaySentence(text);
  if (style === 'exact') return original;

  const term = parseGlossarySentence(original);
  if (term) {
    const termText = speechClean(term.term, style);
    const translation = speechClean(term.translation, style);
    if (style === 'study') return `Term: ${termText}. Spanish: ${translation}.`;
    if (style === 'podcast') return `${termText}. In Spanish: ${translation}.`;
    return `${termText}. ${translation}.`;
  }

  if (kind === 'heading') {
    const h = speechClean(original, style);
    if (style === 'study') return `Next section: ${h}.`;
    if (style === 'podcast') return `Now, ${h}.`;
    return h.endsWith('.') ? h : `${h}.`;
  }

  let s = speechClean(original, style);
  if (style === 'study') {
    s = s.replace(/\bmeans\b/gi, 'means');
  }
  return s;
}

function speechClean(text, style) {
  let s = String(text || '')
    .replace(/[•▪●]/g, '')
    .replace(/\s*\/\s*/g, ' or ')
    .replace(/\s*[—–]\s*/g, style === 'smooth' ? '. ' : ', ')
    .replace(/\s*#\s*/g, ' number ')
    .replace(/&/g, ' and ')
    .replace(/\(([^)]{1,80})\)/g, ', $1,')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,{2,}/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (style === 'podcast') {
    s = s.replace(/\bexample:/gi, 'For example,');
  }
  return s;
}

function populateVoices() {
  voices = speechSynthesis.getVoices();
  const select = $('voiceSelect');
  if (!select) return;
  const current = settings.voiceURI || select.value;
  select.innerHTML = voices.map((v) => {
    const value = v.voiceURI || `${v.name}-${v.lang}`;
    return `<option value="${escapeHtml(value)}">${escapeHtml(v.name)} (${escapeHtml(v.lang)})</option>`;
  }).join('');

  const preferred = current || findBestDefaultVoiceURI();
  if (preferred && [...select.options].some(o => o.value === preferred)) {
    select.value = preferred;
  }
  settings.voiceURI = select.value || '';
  saveSettings();
}

function findBestDefaultVoiceURI() {
  const candidates = voices.filter(v => /^en/i.test(v.lang));
  const preferred = candidates.find(v => /Samantha|Google US English|Daniel|Karen|Alex|Natural|Premium/i.test(v.name));
  const fallback = preferred || candidates[0] || voices[0];
  return fallback ? (fallback.voiceURI || `${fallback.name}-${fallback.lang}`) : '';
}

function getSelectedVoice() {
  const value = $('voiceSelect')?.value || settings.voiceURI;
  return voices.find(v => (v.voiceURI || `${v.name}-${v.lang}`) === value) || null;
}

function markReadThrough(i) {
  textUnits.forEach((u, idx) => u.span.classList.toggle('read', idx <= i));
}

function setCurrent(i) {
  textUnits.forEach(u => u.span.classList.remove('current'));
  if (textUnits[i]) textUnits[i].span.classList.add('current');
}

function scrollToIndex(i) {
  if (textUnits[i]) textUnits[i].span.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

async function saveProgress() {
  if (!currentPdfId) return;
  await storageSet({ [progressKey(currentPdfId)]: { index: currentIndex, updatedAt: Date.now(), style: settings.style } });
  renderList();
}

function readFrom(i) {
  if (!currentPdfId || !textUnits.length) return;
  stopReading(false);
  readControlsIntoSettings();
  storageSet({ [SETTINGS_KEY]: settings });
  if (settings.voiceMode === 'elevenlabs' && (!settings.elevenApiKey || !settings.elevenVoiceId)) {
    setStatus('Custom AI Voice needs an ElevenLabs API key and Voice ID first.');
    return;
  }
  reading = true;
  manuallyPaused = false;
  readingToken++;
  currentIndex = Math.max(0, Math.min(i, textUnits.length - 1));
  speakNext(readingToken);
}

function speakNext(token) {
  if (!reading || manuallyPaused || token !== readingToken) return;
  if (currentIndex >= textUnits.length) {
    reading = false;
    saveProgress();
    setStatus('Finished reading.');
    return;
  }

  const unit = textUnits[currentIndex];
  setCurrent(currentIndex);
  markReadThrough(currentIndex - 1);
  scrollToIndex(currentIndex);
  setStatus(`Reading section ${currentIndex + 1} of ${textUnits.length}.`);

  if (settings.voiceMode === 'elevenlabs') {
    speakNextWithElevenLabs(unit, token);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(unit.text);
  const selectedVoice = getSelectedVoice();
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = Number(settings.rate || DEFAULT_SETTINGS.rate);
  utterance.pitch = Number(settings.pitch || DEFAULT_SETTINGS.pitch);
  utterance.volume = 1;

  utterance.onend = async () => {
    if (!reading || token !== readingToken) return;
    markReadThrough(currentIndex);
    currentIndex++;
    await saveProgress();
    const pause = getPauseAfter(unit);
    scheduleNext(token, pause);
  };

  utterance.onerror = () => {
    if (!reading || token !== readingToken) return;
    currentIndex++;
    scheduleNext(token, settings.sentencePause || 250);
  };

  speechSynthesis.speak(utterance);
}


async function speakNextWithElevenLabs(unit, token) {
  try {
    setStatus(`Generating AI voice for section ${currentIndex + 1} of ${textUnits.length}...`);
    const audioUrl = await getElevenLabsAudioUrl(unit.text);
    if (!reading || token !== readingToken || manuallyPaused) return;

    currentAudio = new Audio(audioUrl);
    currentAudio.volume = 1;
    currentAudio.onended = async () => {
      if (!reading || token !== readingToken) return;
      markReadThrough(currentIndex);
      currentIndex++;
      currentAudio = null;
      await saveProgress();
      const pause = getPauseAfter(unit);
      scheduleNext(token, pause);
    };
    currentAudio.onerror = () => {
      if (!reading || token !== readingToken) return;
      setStatus('AI audio playback failed; moving to next section.');
      currentIndex++;
      currentAudio = null;
      scheduleNext(token, settings.sentencePause || 250);
    };
    setStatus(`Playing AI voice section ${currentIndex + 1} of ${textUnits.length}.`);
    await currentAudio.play();
  } catch (err) {
    console.error(err);
    if (!reading || token !== readingToken) return;
    setStatus(`Custom AI Voice error: ${err.message || err}`);
    reading = false;
  }
}

function elevenCacheKey(text) {
  return [
    settings.elevenVoiceId,
    settings.elevenModelId,
    Number(settings.elevenStability).toFixed(2),
    Number(settings.elevenSimilarity).toFixed(2),
    text
  ].join('|');
}

async function getElevenLabsAudioUrl(text) {
  const cleaned = String(text || '').trim();
  if (!cleaned) throw new Error('No text to read.');
  const key = elevenCacheKey(cleaned);
  if (audioCache.has(key)) return audioCache.get(key);

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(settings.elevenVoiceId)}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': settings.elevenApiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: cleaned,
      model_id: settings.elevenModelId || 'eleven_multilingual_v2',
      voice_settings: {
        stability: Number(settings.elevenStability ?? 0.50),
        similarity_boost: Number(settings.elevenSimilarity ?? 0.75),
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    let details = '';
    try { details = await response.text(); } catch (_) {}
    throw new Error(`ElevenLabs request failed (${response.status}). ${details.slice(0, 180)}`);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  audioCache.set(key, objectUrl);
  return objectUrl;
}

async function loadElevenLabsVoices() {
  readControlsIntoSettings();
  await saveSettings();
  if (!settings.elevenApiKey) {
    setStatus('Paste your ElevenLabs API key first.');
    return;
  }
  const select = $('elevenVoiceSelect');
  if (select) select.innerHTML = '<option value="">Loading voices...</option>';
  try {
    const response = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', {
      headers: { 'xi-api-key': settings.elevenApiKey }
    });
    if (!response.ok) throw new Error(`Could not load voices (${response.status}).`);
    const data = await response.json();
    const voices = data.voices || [];
    if (!voices.length) throw new Error('No voices found for this API key.');
    select.innerHTML = voices.map(v => `<option value="${escapeHtml(v.voice_id)}">${escapeHtml(v.name || v.voice_id)} — ${escapeHtml(v.category || 'voice')}</option>`).join('');
    const preferred = settings.elevenVoiceId || voices[0].voice_id;
    if ([...select.options].some(o => o.value === preferred)) select.value = preferred;
    $('elevenVoiceId').value = select.value;
    readControlsIntoSettings();
    await saveSettings();
    setStatus(`Loaded ${voices.length} ElevenLabs voice${voices.length === 1 ? '' : 's'}.`);
  } catch (err) {
    if (select) select.innerHTML = '<option value="">Could not load voices</option>';
    setStatus(`Voice list error: ${err.message || err}`);
  }
}

async function testElevenLabsVoice() {
  readControlsIntoSettings();
  await saveSettings();
  if (!settings.elevenApiKey || !settings.elevenVoiceId) {
    setStatus('Paste your ElevenLabs API key and Voice ID first.');
    return;
  }
  try {
    if (testAudio) {
      testAudio.pause();
      testAudio = null;
    }
    const originalCache = currentPdfId;
    setStatus('Generating test AI voice...');
    const sample = 'This is your custom AI voice for PDF study mode. The reader will keep your place and highlight each section as it plays.';
    const audioUrl = await getElevenLabsAudioUrl(sample);
    testAudio = new Audio(audioUrl);
    testAudio.onended = () => setStatus('Test voice finished.');
    await testAudio.play();
    setStatus('Playing test AI voice.');
  } catch (err) {
    setStatus(`Test voice error: ${err.message || err}`);
  }
}

function getPauseAfter(unit) {
  let base = Number(settings.sentencePause || DEFAULT_SETTINGS.sentencePause);
  if (unit.kind === 'heading') base = Number(settings.headingPause || DEFAULT_SETTINGS.headingPause);
  else if (unit.paragraphEnd || unit.kind === 'term') base = Math.max(base, Number(settings.paragraphPause || DEFAULT_SETTINGS.paragraphPause));

  const t = unit.displayText || unit.text || '';
  if (/[?!]["')\]]?$/.test(t)) base += 100;
  if (t.length < 45) base += 100;
  return Math.max(0, base);
}

function scheduleNext(token, pauseMs) {
  if (!reading || token !== readingToken || manuallyPaused) return;
  clearDelayTimer();
  delayTimer = setTimeout(() => {
    delayTimer = null;
    speakNext(token);
  }, pauseMs);
}

function clearDelayTimer() {
  if (delayTimer) {
    clearTimeout(delayTimer);
    delayTimer = null;
  }
}

function pauseReading() {
  manuallyPaused = true;
  clearDelayTimer();
  if (currentAudio && !currentAudio.paused) currentAudio.pause();
  speechSynthesis.pause();
  setStatus('Paused.');
}

function continueReading() {
  manuallyPaused = false;
  if (settings.voiceMode === 'elevenlabs' && currentAudio && currentAudio.paused) {
    currentAudio.play().catch(err => setStatus(`Could not continue AI audio: ${err.message || err}`));
    setStatus('Continuing.');
    return;
  }
  speechSynthesis.resume();
  if (reading && !speechSynthesis.speaking && !delayTimer) {
    scheduleNext(readingToken, 150);
  }
  setStatus('Continuing.');
}

function stopReading(clearCurrent = true) {
  reading = false;
  manuallyPaused = false;
  readingToken++;
  clearDelayTimer();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  speechSynthesis.cancel();
  if (clearCurrent) textUnits.forEach(u => u.span.classList.remove('current'));
}

async function extractPdfText(buffer) {
  const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer.slice(0)) : new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    cMapUrl: new URL('./vendor/cmaps/', import.meta.url).toString(),
    cMapPacked: true,
    standardFontDataUrl: new URL('./vendor/standard_fonts/', import.meta.url).toString(),
    useSystemFonts: true,
    disableFontFace: false
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    setStatus(`Extracting text: page ${pageNum} of ${pdf.numPages}...`);
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent({ includeMarkedContent: false, disableNormalization: false });
    const pageText = textItemsToReadableText(textContent.items);
    if (pageText.trim()) pages.push(`--- Page ${pageNum} ---\n${pageText}`);
  }

  await pdf.destroy();
  return cleanupExtractedText(pages.join('\n\n'));
}

function textItemsToReadableText(items) {
  let out = '';
  let lastY = null;
  let lastX = null;

  for (const item of items) {
    if (!item || typeof item.str !== 'string') continue;
    const str = item.str.replace(/\s+/g, ' ');
    if (!str.trim() && !item.hasEOL) continue;

    const transform = item.transform || [];
    const x = Number(transform[4] || 0);
    const y = Number(transform[5] || 0);
    const height = Number(item.height || 10);
    const yTolerance = Math.max(3, height * 0.45);

    if (lastY !== null && Math.abs(y - lastY) > yTolerance && !out.endsWith('\n')) {
      out = out.trimEnd() + '\n';
    } else if (lastX !== null && x > lastX + 3 && !out.endsWith(' ') && !out.endsWith('\n')) {
      out += ' ';
    }

    out += str;
    if (item.hasEOL) {
      out = out.trimEnd() + '\n';
    } else if (!out.endsWith(' ')) {
      out += ' ';
    }

    lastY = y;
    lastX = x + Number(item.width || 0);
  }

  return out;
}

function cleanupExtractedText(s) {
  return s
    .replace(/\u0000/g, '')
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([a-z])\s*-\s*\n\s*([a-z])/g, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function rebuildTextAfterSettingChange() {
  readControlsIntoSettings();
  updateValueLabels();
  saveSettings();
  if (!currentRawText || !$('textContent')) return;
  const keepIndex = currentIndex;
  stopReading();
  currentIndex = Math.min(keepIndex, Math.max(0, textUnits.length - 1));
  renderTextPane(currentRawText);
  markReadThrough(currentIndex - 1);
  setCurrent(currentIndex);
}


$('fileInput')?.addEventListener('change', e => addFiles(e.target.files));
$('openUrlBtn')?.addEventListener('click', openUrlFromInput);
$('pdfUrlInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') openUrlFromInput(); });
$('playBtn')?.addEventListener('click', () => readFrom(currentIndex));
$('pauseBtn')?.addEventListener('click', pauseReading);
$('continueBtn')?.addEventListener('click', continueReading);
$('stopBtn')?.addEventListener('click', () => stopReading());
$('resumeBtn')?.addEventListener('click', async () => {
  const p = currentPdfId ? await storageGet(progressKey(currentPdfId)) : null;
  readFrom(p?.index || currentIndex || 0);
});
$('invertBtn')?.addEventListener('click', async () => {
  settings.pdfInverted = !settings.pdfInverted;
  applyInvertState();
  await saveSettings();
});
$('advancedToggle')?.addEventListener('click', () => {
  const panel = $('advancedControls');
  if (!panel) return;
  const hidden = panel.hasAttribute('hidden');
  if (hidden) panel.removeAttribute('hidden');
  else panel.setAttribute('hidden', '');
  $('advancedToggle').setAttribute('aria-expanded', String(hidden));
});
$('presetSelect')?.addEventListener('change', async () => {
  applyPreset($('presetSelect').value);
  await saveSettings();
});
$('styleSelect')?.addEventListener('change', rebuildTextAfterSettingChange);
$('voiceSelect')?.addEventListener('change', saveSettings);
$('voiceModeSelect')?.addEventListener('change', async () => {
  readControlsIntoSettings();
  updateVoiceModeUI();
  await saveSettings();
});
$('elevenVoiceSelect')?.addEventListener('change', async () => {
  $('elevenVoiceId').value = $('elevenVoiceSelect').value;
  readControlsIntoSettings();
  await saveSettings();
});
$('loadVoicesBtn')?.addEventListener('click', loadElevenLabsVoices);
$('testVoiceBtn')?.addEventListener('click', testElevenLabsVoice);
['elevenApiKey', 'elevenVoiceId', 'elevenModelId'].forEach(id => {
  $(id)?.addEventListener('change', saveSettings);
});
['rate', 'pitch', 'sentencePause', 'paragraphPause', 'headingPause', 'elevenStability', 'elevenSimilarity'].forEach(id => {
  $(id)?.addEventListener('input', () => {
    readControlsIntoSettings();
    updateValueLabels();
  });
  $(id)?.addEventListener('change', saveSettings);
});

speechSynthesis.onvoiceschanged = populateVoices;

openDB()
  .then(async () => {
    await loadSettings();
    populateVoices();
    await sleep(250);
    populateVoices();
    await renderList();
    const params = new URLSearchParams(location.search);
    const incomingPdfUrl = params.get('pdfUrl');
    const incomingName = params.get('name') || '';
    if (incomingPdfUrl) {
      await addPdfFromUrl(incomingPdfUrl, { name: incomingName, addedFrom: 'external-link' });
      history.replaceState(null, '', location.pathname);
    } else {
      setStatus('Ready. Add a PDF file or paste a direct PDF link. Add this site to your iPhone Home Screen for app-like use.');
    }
  })
  .catch(e => setStatus('Error: ' + e.message));
