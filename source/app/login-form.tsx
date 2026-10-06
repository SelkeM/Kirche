"use client";
import { useState } from "react";
export function LoginForm() {
  const [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      if (r.ok) { location.reload(); return; }
      setError(((await r.json()) as { error?: string }).error || "Anmeldung fehlgeschlagen.");
    } catch { setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen."); }
    setBusy(false);
  }
  return <form onSubmit={submit}><div className="form-grid"><label className="wide">Passwort<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required autoFocus /></label></div>{error && <p role="alert" className="dialog-error">{error}</p>}<p><button className="button primary" disabled={busy || !password}>Anmelden</button></p></form>;
}
export function LogoutLink() {
  return <a href="/" onClick={async e => { e.preventDefault(); await fetch("/api/login", { method: "DELETE" }); location.reload(); }}>Abmelden</a>;
}
