import { createSession, passwordMatches, SESSION_COOKIE, SESSION_SECONDS } from '../../../lib/admin-auth';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const json = (body: object, status = 200, extra: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...extra } });
const sameOrigin = (request: Request) => request.headers.get('origin') === new URL(request.url).origin;
const cookie = (value: string, maxAge: number) => `${SESSION_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Ungültige Anfrage.' }, 403);
  let password = '';
  try { password = String(((await request.json()) as { password?: unknown }).password ?? '').slice(0, 200); } catch { return json({ error: 'Ungültige Eingabe.' }, 400); }
  if (!await passwordMatches(password)) {
    await new Promise(r => setTimeout(r, 800));
    return json({ error: 'Passwort falsch.' }, 401);
  }
  return json({ ok: true }, 200, { 'Set-Cookie': cookie(await createSession(), SESSION_SECONDS) });
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return json({ error: 'Ungültige Anfrage.' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
}
