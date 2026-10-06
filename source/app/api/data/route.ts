import { isAdmin } from '../../../lib/admin-auth';
import { env } from "cloudflare:workers";
import { consolidateMaterials, keyForName, periods, type Stock } from "../../../lib/material-planning";
export const runtime = "edge";
export const dynamic = "force-dynamic";
function db() { if (!env.DB) throw new Error("Datenbank nicht verfügbar"); return env.DB; }
const clean = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
const count = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 0 && n <= 100000 ? n : null; };
const id = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const error = (message: string, status = 400) => Response.json({ error: message }, { status });
async function catalog() {
  const [raw, stock] = await Promise.all([
    db().prepare("SELECT id,name,unit,stock,location,note,packed,consumable FROM materials ORDER BY id").all<any>(),
    db().prepare("SELECT id,material_id AS materialId,location,quantity,packed FROM material_stocks ORDER BY id").all<any>(),
  ]);
  return consolidateMaterials(raw.results, stock.results.map(s => ({ ...s, id: String(s.id) })) as Stock[]);
}
export async function GET() {
  if (!await isAdmin()) return error("Anmeldung als Camp-Organisation erforderlich.", 403);
  try {
    const [data, needs, units] = await Promise.all([catalog(),
      db().prepare("SELECT id,material_id AS materialId,quantity,date,period,unit_name AS unitName,person,project,start_time AS startTime,end_time AS endTime FROM needs ORDER BY date,start_time,id").all<any>(),
      db().prepare("SELECT id,name FROM camp_units ORDER BY name COLLATE NOCASE").all(),
    ]);
    return Response.json({ materials: data.materials, needs: needs.results.map(n => ({ ...n, materialId: data.aliases.get(n.materialId) || n.materialId })), units: units.results, wishes: (await db().prepare("SELECT w.id,w.material_id AS materialId,w.requester,w.quantity,w.unit,w.image_key AS imageKey,w.fulfilled_at AS fulfilledAt,m.name FROM portal_wishes w JOIN materials m ON m.id=w.material_id ORDER BY w.id DESC").all()).results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) { console.error("load material data", e); return error("Daten konnten nicht geladen werden. Bitte erneut versuchen.", 503); }
}
export async function POST(request: Request) {
  if (!await isAdmin()) return error("Anmeldung als Camp-Organisation erforderlich.", 403);
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return error("Ungültige Anfrage.", 403);
  let body: any;
  try { body = await request.json(); } catch { return error("Ungültige Eingabe."); }
  try {
    if (body.action === "saveUnit") {
      const name = clean(body.unit?.name, 100), key = id(body.unit?.id);
      if (!name) return error("Bitte einen Namen eingeben.");
      const rows = await db().prepare("SELECT id,name FROM camp_units").all<{ id: number; name: string }>();
      if (rows.results.some(u => keyForName(u.name) === keyForName(name) && u.id !== key)) return error("Diese Einheit gibt es bereits.");
      if (key) {
        const current = rows.results.find(u => u.id === key); if (!current) return error("Einheit nicht gefunden.", 404);
        await db().batch([db().prepare("UPDATE camp_units SET name=? WHERE id=?").bind(name, key), db().prepare("UPDATE needs SET unit_name=? WHERE unit_name=? COLLATE NOCASE").bind(name, current.name)]);
      } else await db().prepare("INSERT INTO camp_units (name) VALUES (?)").bind(name).run();
      return Response.json({ ok: true });
    }
    if (body.action === "deleteUnit") {
      const key = id(body.id); if (!key) return error("Ungültige Einheit.");
      await db().prepare("DELETE FROM camp_units WHERE id=?").bind(key).run(); return Response.json({ ok: true });
    }
    if (body.action === "saveMaterial") {
      const m = body.material || {}, name = clean(m.name, 100), unit = clean(m.unit, 30) || "Stück";
      if (!name || !Array.isArray(m.stocks) || m.stocks.length > 100) return error("Materialname und Lagerbestände prüfen.");
      const stocks = m.stocks.map((s: any) => ({ id: clean(s.id, 50), location: clean(s.location, 100), quantity: count(s.quantity), packed: s.packed ? 1 : 0 }));
      if (stocks.some((s: any) => s.quantity === null)) return error("Alle Lagerbestände müssen gültige ganze Mengen sein.");
      const data = await catalog();
      let key = id(m.id);
      const current = data.materials.find(x => x.id === key);
      if (key && !current) return error("Material nicht gefunden.", 404);
      if (data.materials.some(x => keyForName(x.name) === keyForName(name) && x.id !== key)) return error("Dieses Material gibt es bereits. Ergänze dort einen weiteren Lagerort.");
      if (!key) {
        const created = await db().prepare("INSERT INTO materials (name,unit,stock,location,note,packed,consumable) VALUES (?, ?, 0, '', '', 0, ?)").bind(name, unit, m.consumable ? 1 : 0).run();
        key = Number(created.meta.last_row_id);
      }
      const memberIds = current?.memberIds || [key];
      const statements: D1PreparedStatement[] = [];
      for (const member of memberIds) {
        statements.push(db().prepare("DELETE FROM material_stocks WHERE material_id=?").bind(member));
        if (member !== key) {
          statements.push(db().prepare("UPDATE needs SET material_id=? WHERE material_id=?").bind(key, member));
          statements.push(db().prepare("UPDATE portal_wishes SET material_id=? WHERE material_id=?").bind(key, member));
          statements.push(db().prepare("DELETE FROM materials WHERE id=?").bind(member));
        }
      }
      statements.push(db().prepare("UPDATE materials SET name=?,unit=?,stock=?,location=?,note=?,packed=0,consumable=? WHERE id=?").bind(name, unit, stocks.reduce((sum: number, s: any) => sum + s.quantity, 0), stocks[0]?.location || "", clean(m.note, 500), m.consumable ? 1 : 0, key));
      // A zero row prevents the legacy fallback from restoring an old quantity.
      const holdings = stocks.length ? stocks : [{ id: "", location: "", quantity: 0, packed: 0 }];
      for (const holding of holdings) {
        const original = current?.stocks.find(s => s.id === holding.id);
        const stableId = original && !original.id.startsWith("legacy-") ? id(original.id) : null;
        const packed = original && original.quantity === holding.quantity && original.location === holding.location ? holding.packed : 0;
        statements.push(db().prepare("INSERT INTO material_stocks (id,material_id,location,quantity,packed) VALUES (?, ?, ?, ?, ?)").bind(stableId, key, holding.location, holding.quantity, packed));
      }
      if (stocks.some((s: any) => s.quantity > 0)) statements.push(db().prepare("UPDATE portal_wishes SET fulfilled_at=? WHERE material_id=? AND fulfilled_at IS NULL").bind(Date.now(), key));
      await db().batch(statements); return Response.json({ ok: true });
    }
    if (body.action === "deleteMaterial") {
      const key = id(body.id), data = await catalog(), m = data.materials.find(x => x.id === key);
      if (!m) return error("Material nicht gefunden.", 404);
      for (const member of m.memberIds) {
        if (await db().prepare("SELECT id FROM portal_wishes WHERE material_id=? LIMIT 1").bind(member).first()) return error("Material ist mit Camp-Wünschen verknüpft und kann nicht gelöscht werden.");
        if (await db().prepare("SELECT id FROM needs WHERE material_id=? LIMIT 1").bind(member).first()) return error("Material ist noch in Bedarfen eingetragen. Lösche zuerst diese Bedarfe.");
      }
      await db().batch(m.memberIds.flatMap(member => [db().prepare("DELETE FROM material_stocks WHERE material_id=?").bind(member), db().prepare("DELETE FROM materials WHERE id=?").bind(member)]));
      return Response.json({ ok: true });
    }
    if (body.action === "togglePacked") {
      const stockId = clean(body.stockId, 50);
      const data = await catalog(), stock = data.materials.flatMap(m => m.stocks).find(s => s.id === stockId);
      if (!stock) return error("Lagerbestand nicht gefunden.", 404);
      const packed = stock.packed ? 0 : 1;
      await db().batch((stock.sourceIds || [stock.id]).map(source => source.startsWith("legacy-")
        ? db().prepare("UPDATE materials SET packed=? WHERE id=?").bind(packed, Number(source.slice(7)))
        : db().prepare("UPDATE material_stocks SET packed=? WHERE id=?").bind(packed, Number(source))));
      return Response.json({ ok: true });
    }
    if (body.action === "saveNeed" || body.action === "saveNeeds") {
      const rows = body.action === "saveNeeds" ? body.needs : [body.need];
      if (!Array.isArray(rows) || !rows.length || rows.length > 100) return error("Bitte 1 bis 100 Materialzeilen eintragen.");
      const token = clean(body.requestKey, 100);
      if (body.action === "saveNeeds" && !/^[a-zA-Z0-9-]{10,100}$/.test(token)) return error("Ungültige Erfassung. Bitte das Formular neu öffnen.");
      const normalized = rows.map((n: any) => ({ id: id(n?.id), materialName: clean(n?.materialName, 100), materialUnit: clean(n?.materialUnit, 30) || "Stück", consumable: n?.consumable ? 1 : 0, quantity: count(n?.quantity), date: clean(n?.date, 10), period: clean(n?.period, 30), unitName: clean(n?.unitName, 100), person: clean(n?.person, 100), project: clean(n?.project, 100), startTime: clean(n?.startTime, 5), endTime: clean(n?.endTime, 5) }));
      for (const n of normalized) {
        if (!n.materialName || !n.quantity || !/^\d{4}-\d{2}-\d{2}$/.test(n.date) || !periods.includes(n.period)) return error("Material, Menge, Datum und Tageszeit in allen Zeilen prüfen.");
        if ((n.startTime || n.endTime) && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(n.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(n.endTime) || n.endTime <= n.startTime)) return error("Start und Ende gemeinsam angeben. Das Ende muss am selben Tag nach dem Start liegen.");
      }
      const data = await catalog();
      const known = new Map(data.materials.map(m => [keyForName(m.name), m]));
      const statements: D1PreparedStatement[] = [], inserted = new Set<string>();
      const units = await db().prepare("SELECT name FROM camp_units").all<{ name: string }>();
      const unitMap = new Map(units.results.map(u => [keyForName(u.name), u.name]));
      for (let index = 0; index < normalized.length; index++) {
        const n = normalized[index], nameKey = keyForName(n.materialName), existing = known.get(nameKey);
        const name = existing?.name || normalized.find(r => keyForName(r.materialName) === nameKey)!.materialName;
        if (!existing && !inserted.has(nameKey)) {
          statements.push(db().prepare("INSERT INTO materials (name,unit,stock,location,note,packed,consumable) SELECT ?, ?, 0, '', '', 0, ? WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name=?)").bind(name, n.materialUnit, n.consumable, name)); inserted.add(nameKey);
        }
        let unitName = n.unitName;
        if (unitName) {
          const unitKey = keyForName(unitName), saved = unitMap.get(unitKey);
          if (saved) unitName = saved;
          else { statements.push(db().prepare("INSERT OR IGNORE INTO camp_units (name) VALUES (?)").bind(unitName)); unitMap.set(unitKey, unitName); }
        }
        const values = [name, n.quantity, n.date, n.period, unitName, n.person, n.project, n.startTime, n.endTime];
        if (n.id) {
          if (!await db().prepare("SELECT id FROM needs WHERE id=?").bind(n.id).first()) return error("Bedarf nicht gefunden.", 404);
          statements.push(db().prepare("UPDATE needs SET material_id=(SELECT id FROM materials WHERE name=? ORDER BY id LIMIT 1),quantity=?,date=?,period=?,unit_name=?,person=?,project=?,start_time=?,end_time=? WHERE id=?").bind(...values, n.id));
        } else statements.push(db().prepare("INSERT OR IGNORE INTO needs (material_id,quantity,date,period,unit_name,person,project,start_time,end_time,request_key) VALUES ((SELECT id FROM materials WHERE name=? ORDER BY id LIMIT 1),?,?,?,?,?,?,?,?,?)").bind(...values, token ? `${token}-${index}` : null));
        for (const member of existing?.memberIds || []) {
          statements.push(db().prepare("UPDATE material_stocks SET packed=0 WHERE material_id=?").bind(member));
          statements.push(db().prepare("UPDATE materials SET packed=0 WHERE id=?").bind(member));
        }
      }
      await db().batch(statements); return Response.json({ ok: true });
    }
    if (body.action === "deleteWish") {
      const key = id(body.id); if (!key) return error("Ungültiger Wunsch.");
      const wish = await db().prepare("SELECT material_id AS materialId,image_key AS imageKey FROM portal_wishes WHERE id=?").bind(key).first<{ materialId: number; imageKey: string | null }>();
      if (!wish) return error("Wunsch nicht gefunden.", 404);
      await db().batch([
        db().prepare("DELETE FROM portal_wishes WHERE id=?").bind(key),
        // Remove the placeholder material the portal created if nothing else uses it.
        db().prepare("DELETE FROM materials WHERE id=? AND stock=0 AND NOT EXISTS (SELECT 1 FROM material_stocks WHERE material_id=materials.id AND quantity>0) AND NOT EXISTS (SELECT 1 FROM needs WHERE material_id=materials.id) AND NOT EXISTS (SELECT 1 FROM portal_wishes WHERE material_id=materials.id)").bind(wish.materialId),
      ]);
      if (wish.imageKey && env.BUCKET) await env.BUCKET.delete("portal/" + wish.imageKey).catch(() => {});
      return Response.json({ ok: true });
    }
    if (body.action === "deleteNeed") {
      const key = id(body.id); if (!key) return error("Ungültiger Bedarf.");
      await db().prepare("DELETE FROM needs WHERE id=?").bind(key).run(); return Response.json({ ok: true });
    }
    return error("Unbekannte Aktion.");
  } catch (e) { console.error("save material data", e); return error("Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten. Bitte erneut versuchen.", 503); }
}
