import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

export const SESSION_COOKIE = 'kc_admin';
export const SESSION_SECONDS = 60 * 60 * 24 * 30;

const enc = new TextEncoder();
function secrets() {
  const e = env as unknown as { ADMIN_PASSWORD?: string; SESSION_SECRET?: string };
  return { password: e.ADMIN_PASSWORD || '', secret: e.SESSION_SECRET || e.ADMIN_PASSWORD || '' };
}
async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value)));
  return [...sig].map(b => b.toString(16).padStart(2, '0')).join('');
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
export async function passwordMatches(input: string) {
  const { password, secret } = secrets();
  if (!password) return false;
  // Compare HMACs so length and content do not leak through timing.
  return equal(await sign(input, secret), await sign(password, secret));
}
export async function createSession() {
  const { secret } = secrets();
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${expires}.${await sign('admin.' + expires, secret)}`;
}
export async function isAdmin() {
  const { password, secret } = secrets();
  if (!password) return false;
  const cookie = (await headers()).get('cookie') || '';
  const raw = cookie.split(';').map(c => c.trim()).find(c => c.startsWith(SESSION_COOKIE + '='));
  const [expires, mac] = (raw?.slice(SESSION_COOKIE.length + 1) || '').split('.');
  if (!expires || !mac || !/^\d+$/.test(expires) || Number(expires) < Date.now() / 1000) return false;
  return equal(mac, await sign('admin.' + expires, secret));
}
