import {
  acceptInvite,
  getUser,
  handleAuthCallback,
  login,
  logout,
  requestPasswordRecovery,
  updateUser
} from '@netlify/identity';

const languages = ['de', 'en', 'uk'];
const languageNames = { de: 'Deutsch', en: 'Englisch', uk: 'Ukrainisch' };
const tabs = [
  { id: 'basis', title: 'Grunddaten', help: 'Kontaktdaten, Anreisezeiten und die beschreibenden Texte der Ferienwohnung.', fields: [
    { path: ['contact'], label: 'Kontaktdaten', keys: ['email', 'phone', 'whatsapp'] },
    { path: ['site'], label: 'Adresse & Buchungslinks', keys: ['address_de', 'address_en', 'address_uk', 'google_reviews_url', 'airbnb_url', 'booking_url'] },
    { path: ['hero'], label: 'Kurztext im Titelbild' },
    { path: ['about'], label: 'Beschreibung der Villa' },
    { path: ['copy', 'location_intro'], label: 'Beschreibung der Lage' },
    { path: ['checkin_time'], label: 'Check-in Uhrzeit' },
    { path: ['checkout_time'], label: 'Check-out Uhrzeit' },
    { path: ['kaution'], label: 'Kaution' }
  ]},
  { id: 'preise', title: 'Preise', help: 'Zeiträume, Nachtpreise und Zusatzkosten für Villa und Apartment.', fields: [
    { path: ['prices_villa'], label: 'Preise Villa' }, { path: ['prices_villa_notes'], label: 'Zusatzkosten Villa' },
    { path: ['prices_apt'], label: 'Preise Apartment' }, { path: ['prices_apt_notes'], label: 'Zusatzkosten Apartment' }
  ]},
  { id: 'ausstattung', title: 'Ausstattung & Lage', help: 'Merkmale, Ausstattung und Entfernungen zu wichtigen Orten.', fields: [
    { path: ['hero_pills'], label: 'Merkmale im Titelbild' }, { path: ['highlights'], label: 'Merkmalsleiste' },
    { path: ['amenities'], label: 'Ausstattungsgruppen' }, { path: ['distances'], label: 'Entfernungen' }
  ]},
  { id: 'galerie', title: 'Galerie', help: 'Bilder hochladen, beschriften und in die gewünschte Reihenfolge bringen.', fields: [{ path: ['gallery'], label: 'Galeriebilder' }] },
  { id: 'bewertungen', title: 'Bewertungen', help: 'Echte Gästestimmen, Namen, Herkunft, Datum und Sterne.', fields: [{ path: ['reviews'], label: 'Bewertungen' }] },
  { id: 'versionen', title: 'Versionen', help: 'Eine der letzten drei gespeicherten Inhaltsversionen wiederherstellen.', fields: [] }
];

const labels = {
  site: 'Website & Links', contact: 'Kontakt', seo: 'SEO & Suchmaschinen', hero: 'Hero-Bereich', about: 'Über die Villa', footer_tagline: 'Footer-Kurztext',
  checkin_time: 'Check-in Uhrzeit', checkout_time: 'Check-out Uhrzeit', kaution: 'Kaution', copy: 'Sämtliche Oberflächentexte', legal: 'Rechtstexte',
  prices_villa: 'Preise Villa', prices_villa_notes: 'Zusatzkosten Villa', prices_apt: 'Preise Apartment', prices_apt_notes: 'Zusatzkosten Apartment',
  hero_pills: 'Merkmale im Titelbild', highlights: 'Merkmalsleiste', amenities: 'Ausstattungsgruppen', distances: 'Entfernungen', gallery: 'Galeriebilder', reviews: 'Bewertungen',
  name: 'Name', company: 'Unternehmen', copyright: 'Copyright-Zeile', canonical_url: 'Hauptdomain', hero_image: 'Titelbild', owner_name: 'Gastgeber',
  email: 'E-Mail', phone: 'Telefon', whatsapp: 'WhatsApp-Nummer', formspree_id: 'Formspree-ID', google_reviews_url: 'Link zu Google-Bewertungen', airbnb_url: 'Airbnb-Link', booking_url: 'Booking.com-Link',
  title: 'Titel', description: 'Beschreibung', og_title: 'Social-Media-Titel', og_description: 'Social-Media-Beschreibung', schema_description: 'Strukturierte Beschreibung',
  heading_de: 'Überschrift Deutsch', heading_en: 'Überschrift Englisch', heading_uk: 'Überschrift Ukrainisch', body_de: 'Text Deutsch', body_en: 'Text Englisch', body_uk: 'Text Ukrainisch',
  src: 'Bilddatei', alt_de: 'Alternativtext', icon: 'Symbol', price: 'Preis', highlight: 'Hervorheben', stars: 'Sterne', platform: 'Plattform', origin: 'Herkunft', dist: 'Entfernung'
};

let content = null;
let contentSha = '';
let history = [];
let activeTab = 'basis';
let dirty = false;
let inviteToken = '';
let callbackType = '';

const $ = selector => document.querySelector(selector);
const auth = $('#auth');
const app = $('#app');
const editor = $('#editor');
const loading = $('#loading');
const toast = $('#toast');

boot().catch(error => showAuthError(readError(error)));

async function boot() {
  setLoading(true);
  try {
    const callback = await handleAuthCallback();
    if (callback?.type === 'invite' && callback.token) {
      inviteToken = callback.token;
      callbackType = 'invite';
      showPasswordForm('Willkommen! Bitte legen Sie jetzt Ihr persönliches Passwort fest.');
      return;
    }
    if (callback?.type === 'recovery') {
      callbackType = 'recovery';
      showPasswordForm('Bitte legen Sie jetzt ein neues Passwort fest.');
      return;
    }
    const user = await getUser();
    if (user) await enterApp();
  } finally {
    setLoading(false);
  }
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  showAuthError('');
  setLoading(true);
  try {
    await login($('#email').value.trim(), $('#password').value);
    await enterApp();
  } catch (error) {
    showAuthError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
  } finally {
    setLoading(false);
  }
});

$('#forgot').addEventListener('click', async () => {
  const email = $('#email').value.trim();
  if (!email) return showAuthError('Bitte zuerst die E-Mail-Adresse eintragen.');
  setLoading(true);
  try {
    await requestPasswordRecovery(email);
    showAuthError('Der Link zum Zurücksetzen wurde per E-Mail versendet.', true);
  } catch (error) {
    showAuthError(readError(error));
  } finally {
    setLoading(false);
  }
});

$('#password-form').addEventListener('submit', async event => {
  event.preventDefault();
  const password = $('#new-password').value;
  setLoading(true);
  try {
    if (callbackType === 'invite') await acceptInvite(inviteToken, password);
    else await updateUser({ password });
    callbackType = '';
    inviteToken = '';
    await enterApp();
  } catch (error) {
    showAuthError(readError(error));
  } finally {
    setLoading(false);
  }
});

$('#logout').addEventListener('click', async () => {
  if (dirty && !confirm('Ungespeicherte Änderungen verwerfen und abmelden?')) return;
  await logout();
  location.reload();
});

$('#save').addEventListener('click', saveContent);

async function enterApp() {
  auth.classList.add('hidden');
  app.classList.remove('hidden');
  await loadContent();
}

async function loadContent() {
  setLoading(true);
  try {
    const data = await api('/api/content');
    content = data.content;
    contentSha = data.sha;
    history = data.history || [];
    dirty = false;
    renderTabs();
    renderActiveTab();
    updateSaveState();
  } catch (error) {
    app.classList.add('hidden');
    auth.classList.remove('hidden');
    showAuthError(readError(error));
  } finally {
    setLoading(false);
  }
}

function renderTabs() {
  $('#tabs').innerHTML = tabs.map(tab => `<button type="button" class="tab${tab.id === activeTab ? ' active' : ''}" data-tab="${tab.id}">${escapeHtml(tab.title)}</button>`).join('');
  $('#tabs').querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    activeTab = button.dataset.tab;
    renderTabs();
    renderActiveTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

function renderActiveTab() {
  const tab = tabs.find(item => item.id === activeTab) || tabs[0];
  $('#section-title').textContent = tab.title;
  $('#section-help').textContent = tab.help;
  if (tab.id === 'versionen') {
    renderVersions();
    return;
  }
  editor.innerHTML = tab.fields.map(field => {
    const value = getAt(field.path);
    const body = field.keys
      ? field.keys.map(key => renderNode(key, value?.[key], [...field.path, key])).join('')
      : renderNode(field.path.at(-1), value, field.path, true);
    return `<section class="panel"><h2>${escapeHtml(field.label || labelFor(field.path.at(-1)))}</h2>${body}</section>`;
  }).join('');
  bindEditorEvents();
}

function renderNode(key, value, path, root = false) {
  if (Array.isArray(value)) return renderArray(key, value, path);
  if (value && typeof value === 'object') {
    const keys = Object.keys(value);
    const localized = keys.length >= 3 && languages.every(lang => keys.includes(lang));
    if (localized) {
      return `<div class="language-grid">${languages.map(lang => `<div class="lang-field"><span class="lang-badge">${languageNames[lang]}</span>${renderNode(lang, value[lang], [...path, lang])}</div>`).join('')}</div>`;
    }
    return `<div${root ? '' : ' class="group"'}>${keys.map(child => renderNode(child, value[child], [...path, child])).join('')}</div>`;
  }
  return renderPrimitive(key, value, path);
}

function renderPrimitive(key, value, path) {
  const encoded = encodePath(path);
  if (typeof value === 'boolean') {
    return `<div class="field"><span class="field-label">${escapeHtml(labelFor(key))}</span><label class="checkbox-row"><input type="checkbox" data-value-path="${encoded}"${value ? ' checked' : ''}> Ja</label></div>`;
  }
  const text = String(value ?? '');
  const multiline = text.length > 90 || /(body|text|note|description|privacy|imprint|items)/i.test(key);
  const type = /(stars)/i.test(key) ? 'number' : /(email)/i.test(key) ? 'email' : /(url)/i.test(key) ? 'url' : 'text';
  return `<div class="field"><label>${escapeHtml(labelFor(key))}</label>${multiline
    ? `<textarea data-value-path="${encoded}">${escapeHtml(text)}</textarea>`
    : `<input type="${type}" data-value-path="${encoded}" value="${escapeAttr(text)}"${type === 'number' ? ' min="0" max="5"' : ''}>`}
    ${key === 'src' ? renderUpload(path) : ''}</div>`;
}

function renderArray(key, values, path) {
  if (!values.length) return `<div class="empty">Noch keine Einträge.</div><div class="array-actions"><button class="small" type="button" data-action="add" data-path="${encodePath(path)}">+ Eintrag hinzufügen</button></div>`;
  const primitive = values.every(value => value === null || typeof value !== 'object');
  const rows = values.map((value, index) => {
    const itemPath = [...path, index];
    if (primitive) {
      return `<div class="group"><div class="group-title">${escapeHtml(labelFor(key))} ${index + 1}<span class="item-actions">${arrayButtons(path, index, values.length)}</span></div>${renderPrimitive(String(index + 1), value, itemPath)}</div>`;
    }
    return `<div class="group"><div class="group-title">${escapeHtml(singular(labelFor(key)))} ${index + 1}<span class="item-actions">${arrayButtons(path, index, values.length)}</span></div>${renderNode(String(index + 1), value, itemPath, true)}</div>`;
  }).join('');
  return `${rows}<div class="array-actions"><button class="small" type="button" data-action="add" data-path="${encodePath(path)}">+ Eintrag hinzufügen</button></div>`;
}

function renderUpload(path) {
  return `<div class="upload-row"><input type="file" accept="image/jpeg,image/png,image/webp,image/avif" data-upload-path="${encodePath(path)}"><button class="small" type="button" data-action="upload" data-path="${encodePath(path)}">Bild hochladen</button></div><div class="help">JPG, PNG, WebP oder AVIF; maximal 6 MB.</div>`;
}

function arrayButtons(path, index, length) {
  const encoded = encodePath(path);
  return `${index ? `<button class="small" type="button" data-action="up" data-path="${encoded}" data-index="${index}">↑</button>` : ''}${index < length - 1 ? `<button class="small" type="button" data-action="down" data-path="${encoded}" data-index="${index}">↓</button>` : ''}<button class="danger small" type="button" data-action="delete" data-path="${encoded}" data-index="${index}">Entfernen</button>`;
}

function bindEditorEvents() {
  editor.querySelectorAll('[data-value-path]').forEach(input => input.addEventListener('input', () => {
    const path = decodePath(input.dataset.valuePath);
    const current = getAt(path);
    let value = input.type === 'checkbox' ? input.checked : input.value;
    if (typeof current === 'number') value = Number(value);
    setAt(path, value);
    markDirty();
  }));
  editor.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => handleAction(button)));
}

async function handleAction(button) {
  const action = button.dataset.action;
  const path = decodePath(button.dataset.path);
  if (action === 'upload') return uploadImage(button, path);
  const list = getAt(path);
  const index = Number(button.dataset.index);
  if (!Array.isArray(list)) return;
  if (action === 'delete') {
    if (!confirm('Diesen Eintrag wirklich entfernen?')) return;
    list.splice(index, 1);
  }
  if (action === 'up') [list[index - 1], list[index]] = [list[index], list[index - 1]];
  if (action === 'down') [list[index + 1], list[index]] = [list[index], list[index + 1]];
  if (action === 'add') list.push(list.length ? blankItem(list[0], path) : newItemForPath(path));
  markDirty();
  renderActiveTab();
}

async function uploadImage(button, path) {
  const input = button.parentElement.querySelector('input[type=file]');
  const file = input?.files?.[0];
  if (!file) return showToast('Bitte zuerst eine Bilddatei auswählen.');
  if (file.size > 6 * 1024 * 1024) return showToast('Das Bild ist größer als 6 MB.');
  setLoading(true);
  try {
    const form = new FormData();
    form.append('image', file);
    const result = await api('/api/images', { method: 'POST', body: form });
    setAt(path, result.path);
    markDirty();
    renderActiveTab();
    showToast('Bild hochgeladen. Bitte jetzt noch speichern.');
  } catch (error) {
    showToast(readError(error));
  } finally {
    setLoading(false);
  }
}

function blankItem(example, path) {
  if (example === undefined) return '';
  if (typeof example === 'string') return '';
  if (typeof example === 'number') return 0;
  if (typeof example === 'boolean') return false;
  if (Array.isArray(example)) return [];
  const clone = {};
  for (const [key, value] of Object.entries(example || {})) clone[key] = blankItem(value, [...path, key]);
  return clone;
}

function newItemForPath(path) {
  const key = String(path.at(-1));
  if (key === 'gallery') return { src: '', alt_de: '', label_de: '', label_en: '', label_uk: '' };
  if (key === 'reviews') return { name: '', origin: '', stars: 5, platform: 'Google', date_de: '', date_en: '', date_uk: '', text_de: '', text_en: '', text_uk: '' };
  if (key === 'prices_villa' || key === 'prices_apt') return { period_de: '', period_en: '', period_uk: '', price: '', highlight: false };
  if (key === 'hero_pills' || key === 'highlights') return { icon: '', text_de: '', text_en: '', text_uk: '' };
  if (key === 'amenities') return { icon: '', title_de: '', title_en: '', title_uk: '', items_de: [], items_en: [], items_uk: [] };
  if (key === 'distances') return { icon: '', name_de: '', name_en: '', name_uk: '', dist: '' };
  return '';
}

async function saveContent() {
  if (!dirty) return showToast('Es gibt keine neuen Änderungen.');
  setLoading(true);
  try {
    const result = await api('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', content, sha: contentSha })
    });
    contentSha = result.sha;
    history = result.history || history;
    dirty = false;
    updateSaveState();
    showToast('Gespeichert. Netlify veröffentlicht die Änderung automatisch.');
  } catch (error) {
    showToast(readError(error));
  } finally {
    setLoading(false);
  }
}

function renderVersions() {
  editor.innerHTML = `<section class="panel"><h2>Letzte drei Versionen</h2><div class="versions">${history.length ? history.slice(0, 3).map(item => `<div class="version"><div class="version-main"><div class="version-title">${escapeHtml(item.message || 'Inhalte aktualisiert')}</div><div class="version-meta">${escapeHtml(formatDate(item.date))} · ${escapeHtml(item.author || '')}</div></div><button class="secondary" type="button" data-restore="${escapeAttr(item.sha)}">Wiederherstellen</button></div>`).join('') : '<div class="empty">Noch keine früheren Versionen verfügbar.</div>'}</div></section>`;
  editor.querySelectorAll('[data-restore]').forEach(button => button.addEventListener('click', () => restoreVersion(button.dataset.restore)));
}

async function restoreVersion(commitSha) {
  if (!confirm('Diese Version als neuen Stand wiederherstellen und veröffentlichen?')) return;
  setLoading(true);
  try {
    const result = await api('/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore', commitSha, sha: contentSha })
    });
    content = result.content;
    contentSha = result.sha;
    history = result.history || [];
    dirty = false;
    renderActiveTab();
    updateSaveState();
    showToast('Version wiederhergestellt und Veröffentlichung gestartet.');
  } catch (error) {
    showToast(readError(error));
  } finally {
    setLoading(false);
  }
}

async function api(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Serverfehler (${response.status})`);
  return data;
}

function getAt(path) { return path.reduce((value, key) => value?.[key], content); }
function setAt(path, value) { const parent = path.slice(0, -1).reduce((item, key) => item[key], content); parent[path.at(-1)] = value; }
function encodePath(path) { return encodeURIComponent(JSON.stringify(path)); }
function decodePath(value) { return JSON.parse(decodeURIComponent(value)); }
function markDirty() { dirty = true; updateSaveState(); }
function updateSaveState() { $('#save-state').textContent = dirty ? 'Ungespeicherte Änderungen' : 'Alles gespeichert'; }
function setLoading(show) { loading.classList.toggle('hidden', !show); }
function showPasswordForm(message) { $('#login-form').classList.add('hidden'); $('#password-form').classList.remove('hidden'); $('#password-intro').textContent = message; }
function showAuthError(message, success = false) { const el = $('#auth-message'); el.textContent = message; el.className = success ? 'success' : 'error'; }
function showToast(message) { toast.textContent = message; toast.classList.remove('hidden'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.add('hidden'), 5500); }
function readError(error) { return error?.message || 'Ein unerwarteter Fehler ist aufgetreten.'; }
function formatDate(value) { try { return new Intl.DateTimeFormat('de-AT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); } catch { return value || ''; } }
function singular(value) { return value.replace(/bilder$/i, 'bild').replace(/gruppen$/i, 'gruppe').replace(/en$/i, ''); }
function labelFor(key) { return labels[key] || key.replace(/_(de|en|uk)$/i, '').replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function escapeAttr(value) { return escapeHtml(value).replaceAll('`', '&#96;'); }

window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
