import { env } from 'cloudflare:workers';
import { consolidateMaterials, type Stock } from './material-planning';
export function portalDB() { if (!env.DB) throw new Error('Datenbank nicht verfügbar'); return env.DB; }
export async function portalCatalog() {
 const db=portalDB();
 const [m,s]=await Promise.all([db.prepare('SELECT * FROM materials ORDER BY id').all<any>(),db.prepare('SELECT id,material_id AS materialId,location,quantity,packed FROM material_stocks ORDER BY id').all<any>()]);
 return consolidateMaterials(m.results,s.results.map(x=>({...x,id:String(x.id)})) as Stock[]);
}
export async function openWishes() {
 const data=await portalCatalog();
 const wishes=await portalDB().prepare('SELECT w.id,w.material_id AS materialId,w.quantity,w.unit,w.image_key AS imageKey,m.name FROM portal_wishes w JOIN materials m ON m.id=w.material_id WHERE w.fulfilled_at IS NULL ORDER BY w.id DESC').all<any>();
 return wishes.results.filter(w=>!data.materials.find(m=>m.memberIds.includes(w.materialId))?.stock);
}
