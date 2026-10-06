import Admin from './admin-client';
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from './chatgpt-auth';
import { isAdmin } from '../lib/admin-auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await getChatGPTUser();
  if (!user || !await isAdmin()) return <main className="portal admin-login"><header className="portal-brand"><img src="/jugend-logo.svg" alt="jung+ev."/><div><strong>Ev. Jugend Lauenburg<sup>4</sup></strong><span>KonfiCamp · Materialverwaltung</span></div></header><section className="portal-card"><h1>Verwaltung anmelden</h1><p>Dieser Bereich ist geschützt, wenn Du Zugang zur Materialverwaltung benötigst, melde Dich bitte bei Andre.</p>{user?<><p role="alert">Du bist mit einem anderen Konto angemeldet und hast keinen Zugriff auf die Verwaltung.</p><a className="button primary" href={chatGPTSignOutPath('/')} target="_top">Abmelden und Konto wechseln</a></>:<><a className="button primary" href={chatGPTSignInPath('/')} target="_top">Mit ChatGPT anmelden</a><p className="portal-help">Nutze dein ChatGPT-Konto mit der hinterlegten Gmail-Adresse. Wenn du dich dort über Google anmeldest, kannst du diesen Anmeldeweg verwenden.</p></>}<hr/><p>Einkaufswünsche und die Materialsuche sind für alle zugänglich.</p><a className="button secondary" href="/portal">Zum öffentlichen Camp-Portal</a></section></main>;
  return <><div className="admin-session"><span>Angemeldet als André · geschützte Verwaltung</span><a href={chatGPTSignOutPath('/')} target="_top">Abmelden</a></div><Admin/></>;
}
