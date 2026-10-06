import Admin from './admin-client';
import { LoginForm, LogoutLink } from './login-form';
import { isAdmin } from '../lib/admin-auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!await isAdmin()) return <main className="portal admin-login"><header className="portal-brand"><img src="/jugend-logo.svg" alt="jung+ev."/><div><strong>Ev. Jugend Lauenburg<sup>4</sup></strong><span>KonfiCamp · Materialverwaltung</span></div></header><section className="portal-card"><h1>Verwaltung anmelden</h1><p>Dieser Bereich ist geschützt. Wenn du Zugang zur Materialverwaltung benötigst, melde dich bitte bei Andre.</p><LoginForm/><hr/><p>Einkaufswünsche und die Materialsuche sind für alle zugänglich.</p><a className="button secondary" href="/portal">Zum öffentlichen Camp-Portal</a></section></main>;
  return <><div className="admin-session"><span>Geschützte Verwaltung</span><LogoutLink/></div><Admin/></>;
}
