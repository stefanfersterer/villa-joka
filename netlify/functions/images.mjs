import { verifyRequestOrigin } from '@netlify/identity';
import { failure, github, httpError, json, repoConfig, repoPath, requireEditor } from './_shared/github.mjs';

const allowed = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif']
]);

export default async function handler(request) {
  try {
    const user = await requireEditor();
    if (request.method !== 'POST') return json({ error: 'Methode nicht erlaubt.' }, 405);
    verifyRequestOrigin(request);
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof Blob)) throw httpError(400, 'Keine Bilddatei empfangen.');
    if (!allowed.has(file.type)) throw httpError(415, 'Erlaubt sind JPG, PNG, WebP und AVIF.');
    if (file.size < 1 || file.size > 6 * 1024 * 1024) throw httpError(413, 'Das Bild darf maximal 6 MB groß sein.');

    const extension = allowed.get(file.type);
    const base = sanitizeName(file.name || 'bild');
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    const filename = `${base}-${stamp}.${extension}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { branch } = repoConfig();
    await github(repoPath(`public/images/${filename}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Galeriebild hochgeladen: ${filename} (${user.email})`,
        content: bytes.toString('base64'),
        branch
      })
    });
    return json({ path: `images/${filename}` }, 201);
  } catch (error) {
    return failure(error);
  }
}

export function sanitizeName(value) {
  const withoutExtension = String(value).replace(/\.[^.]+$/, '');
  return withoutExtension.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 55) || 'bild';
}
