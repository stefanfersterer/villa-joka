import { readFile, stat } from 'node:fs/promises';
import vm from 'node:vm';
import { validateContent } from '../netlify/functions/content.mjs';
import { sanitizeName } from '../netlify/functions/images.mjs';

const [html, adminHtml, adminJs] = await Promise.all([
  readFile(new URL('../dist/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/admin/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../dist/admin/admin.js', import.meta.url), 'utf8')
]);
const sourceContent = JSON.parse(await readFile(new URL('../content.json', import.meta.url), 'utf8'));
validateContent(sourceContent);
if (sanitizeName('Dachterrasse schön.JPG') !== 'dachterrasse-schon') throw new Error('Bild-Dateinamen werden nicht sicher normalisiert.');
const required = [
  '<!DOCTYPE html>',
  'Villa Joka',
  'class="gallery-grid',
  '</body>',
  '</html>'
];

for (const value of required) {
  if (!html.includes(value)) throw new Error(`Build-Prüfung fehlgeschlagen: ${value} fehlt.`);
}
if (html.includes('diigo')) throw new Error('Browser-Erweiterungs-Code wurde nicht vollständig entfernt.');
if (html.includes('\0')) throw new Error('Die fertige HTML-Datei enthält Nullbytes.');
if (html.includes('CMS LOADER')) throw new Error('Der alte Runtime-CMS-Loader ist noch enthalten.');
if (/\{\{[a-z0-9_.]+\}\}/i.test(html)) throw new Error('Die fertige Website enthält nicht aufgelöste Inhaltsvariablen.');
if (!adminHtml.includes('/admin/admin.js')) throw new Error('Das Dashboard lädt sein JavaScript nicht.');
if (!adminJs.includes('/api/content') || !adminJs.includes('/api/images')) throw new Error('Dashboard-Endpunkte fehlen im Admin-Bundle.');
if (/pagescms/i.test(adminHtml + adminJs)) throw new Error('Veralteter Pages-CMS-Verweis gefunden.');
if (sourceContent.reviews.length && !html.includes('class="review-grid')) {
  throw new Error('Vorhandene Bewertungen wurden nicht ausgegeben.');
}
if (html.includes('id="lb-img"') && html.includes('id="lb-img" src=') && /id="lb-img"[^>]*display:\s*none/i.test(html)) {
  throw new Error('Das Vollbild der Galerie ist weiterhin unsichtbar.');
}
if (!html.includes('event.stopPropagation();moveLb(-1)') || !html.includes('event.stopPropagation();moveLb(1)')) {
  throw new Error('Die Galerie-Navigation schließt beim Weiterschalten möglicherweise das Vollbild.');
}
if (!html.includes('name="buchungsanfrage"') || !html.includes('data-netlify="true"') || !html.includes('name="form-name" value="buchungsanfrage"')) {
  throw new Error('Das Netlify-Kontaktformular ist nicht vollständig konfiguriert.');
}
if (!html.includes('maps?q=Volme%20142%2C%20Haus%202B%2C%2052100%20Banjole%2C%20Kroatien')) {
  throw new Error('Die Karte verweist nicht auf die vollständige Adresse.');
}

const galleryCount = (html.match(/class="gi gi-\d+"/g) || []).length;
if (galleryCount !== sourceContent.gallery.length) throw new Error(`Galerie unvollständig: ${galleryCount} von ${sourceContent.gallery.length} Bildern gebaut.`);
const imageRefs = [...new Set(html.match(/images\/[^"'()\s,]+/g) || [])];
for (const ref of imageRefs) {
  const info = await stat(new URL(`../dist/${ref}`, import.meta.url));
  if (!info.isFile() || info.size < 1) throw new Error(`Bild fehlt oder ist leer: ${ref}`);
}
if (!imageRefs.length) throw new Error('Die fertige Website enthält keine Bilder.');

const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
for (const [index, match] of scripts.entries()) {
  if (/application\/ld\+json/i.test(match[0])) {
    JSON.parse(match[1]);
    continue;
  }
  new vm.Script(match[1], { filename: `index-inline-${index + 1}.js` });
}

new vm.Script(adminJs, { filename: 'admin.js' });

console.log(`Build-Prüfung erfolgreich: Website, ${galleryCount} Galeriebilder und Dashboard validiert (${scripts.length} Inline-Scripts).`);
