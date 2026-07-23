import { verifyRequestOrigin } from '@netlify/identity';
import { decodeBase64, encodeBase64, failure, github, httpError, json, repoConfig, repoPath, requireEditor } from './_shared/github.mjs';

const contentFile = 'content.json';
const required = ['site', 'contact', 'seo', 'copy', 'legal', 'hero', 'about', 'reviews', 'gallery', 'prices_villa', 'prices_villa_notes', 'prices_apt', 'prices_apt_notes', 'hero_pills', 'highlights', 'footer_tagline', 'distances', 'amenities'];

export default async function handler(request) {
  try {
    const user = await requireEditor();
    if (request.method === 'GET') return loadCurrent();
    if (request.method !== 'POST') return json({ error: 'Methode nicht erlaubt.' }, 405);
    verifyRequestOrigin(request);
    const payload = await request.json().catch(() => { throw httpError(400, 'Ungültige Anfrage.'); });
    if (payload.action === 'restore') return restore(payload, user);
    if (payload.action === 'save') return save(payload, user);
    throw httpError(400, 'Unbekannte Aktion.');
  } catch (error) {
    return failure(error);
  }
}

async function loadCurrent() {
  const { branch } = repoConfig();
  const file = await github(`${repoPath(contentFile)}?ref=${encodeURIComponent(branch)}`);
  const content = parseAndValidate(decodeBase64(file.content));
  return json({ content, sha: file.sha, history: await loadHistory() });
}

async function save(payload, user) {
  if (!payload.sha || typeof payload.sha !== 'string') throw httpError(400, 'Versionskennung fehlt. Bitte neu laden.');
  validateContent(payload.content);
  const serialized = `${JSON.stringify(payload.content, null, 2)}\n`;
  if (Buffer.byteLength(serialized, 'utf8') > 750_000) throw httpError(413, 'Die Inhaltsdatei ist zu groß.');
  const result = await putContent(serialized, payload.sha, `Inhalte über Dashboard aktualisiert (${user.email})`);
  return json({ sha: result.content.sha, history: await loadHistory() });
}

async function restore(payload, user) {
  if (!/^[a-f0-9]{40}$/i.test(String(payload.commitSha || ''))) throw httpError(400, 'Ungültige Version.');
  if (!payload.sha || typeof payload.sha !== 'string') throw httpError(400, 'Versionskennung fehlt.');
  const historic = await github(`${repoPath(contentFile)}?ref=${encodeURIComponent(payload.commitSha)}`);
  const restored = parseAndValidate(decodeBase64(historic.content));
  const serialized = `${JSON.stringify(restored, null, 2)}\n`;
  const result = await putContent(serialized, payload.sha, `Inhaltsversion wiederhergestellt (${user.email})`);
  return json({ content: restored, sha: result.content.sha, history: await loadHistory() });
}

async function putContent(serialized, sha, message) {
  const { branch } = repoConfig();
  return github(repoPath(contentFile), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, content: encodeBase64(serialized), sha, branch })
  });
}

async function loadHistory() {
  const { owner, repo, branch } = repoConfig();
  const commits = await github(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(contentFile)}&per_page=4`);
  return commits.slice(1, 4).map(item => ({
    sha: item.sha,
    message: String(item.commit?.message || '').split('\n')[0],
    date: item.commit?.author?.date || '',
    author: item.commit?.author?.name || item.author?.login || ''
  }));
}

function parseAndValidate(raw) {
  let value;
  try { value = JSON.parse(raw); } catch { throw httpError(502, 'content.json im Repository ist ungültig.'); }
  validateContent(value);
  return value;
}

export function validateContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw httpError(400, 'Inhalte müssen ein Objekt sein.');
  for (const key of required) if (value[key] === undefined || value[key] === null) throw httpError(400, `Pflichtbereich „${key}“ fehlt.`);
  if (!Array.isArray(value.gallery) || !value.gallery.length) throw httpError(400, 'Die Galerie braucht mindestens ein Bild.');
  walk(value, []);
}

function walk(value, path) {
  if (path.length > 8) throw httpError(400, 'Die Inhaltsstruktur ist zu tief verschachtelt.');
  if (typeof value === 'string' && value.length > 50_000) throw httpError(400, `Text „${path.join('.')}“ ist zu lang.`);
  if (Array.isArray(value)) {
    if (value.length > 150) throw httpError(400, `Zu viele Einträge in „${path.join('.')}“.`);
    value.forEach((item, index) => walk(item, [...path, index]));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw httpError(400, 'Ungültiger Feldname.');
      walk(item, [...path, key]);
    }
  }
}
