import { getUser } from '@netlify/identity';

export async function requireEditor() {
  const user = await getUser();
  if (!user) throw httpError(401, 'Bitte erneut anmelden.');
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (!roles.some(role => role === 'editor' || role === 'admin')) {
    throw httpError(403, 'Für dieses Konto fehlt die Rolle „editor“.');
  }
  return user;
}

export function repoConfig() {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  const owner = process.env.GITHUB_OWNER || 'stefanfersterer';
  const repo = process.env.GITHUB_REPO || 'villa-joka';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw httpError(500, 'GITHUB_CONTENT_TOKEN ist in Netlify noch nicht eingerichtet.');
  return { token, owner, repo, branch };
}

export async function github(path, options = {}) {
  const { token } = repoConfig();
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'villa-joka-admin',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = response.status === 409
      ? 'Die Inhalte wurden inzwischen anderweitig geändert. Bitte neu laden.'
      : data.message || `GitHub-Fehler (${response.status})`;
    throw httpError(response.status === 409 ? 409 : 502, message);
  }
  return data;
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function failure(error) {
  const status = Number(error?.status) || 500;
  console.error(error);
  return json({ error: status >= 500 ? (error?.message || 'Serverfehler') : error.message }, status);
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function decodeBase64(value) {
  return Buffer.from(String(value || '').replace(/\n/g, ''), 'base64').toString('utf8');
}

export function encodeBase64(value) {
  return Buffer.from(value, 'utf8').toString('base64');
}

export function repoPath(filePath) {
  const { owner, repo } = repoConfig();
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath.split('/').map(encodeURIComponent).join('/')}`;
}
