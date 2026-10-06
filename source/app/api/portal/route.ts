import { env } from 'cloudflare:workers';
import { keyForName } from '../../../lib/material-planning';
import { portalDB, portalCatalog, openWishes } from '../../../lib/portal-data';
export const runtime='edge';
const fail=(error:string,status=400)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request) {
 try {
  const q=(new URL(request.url).searchParams.get('q')||'').trim().toLocaleLowerCase('de');
  const catalog=await portalCatalog();
  const materials=q?catalog.materials.filter(m=>m.name.toLocaleLowerCase('de').includes(q)).slice(0,50).map(m=>({id:m.id,name:m.name,unit:m.unit,packedQuantity:m.stocks.filter(s=>s.packed&&s.quantity>0).reduce((n,s)=>n+s.quantity,0),hasStock:m.stock>0})):[];
  return Response.json({wishes:await openWishes(),materials},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('portal load',e);return fail('Das Portal ist gerade nicht erreichbar. Bitte erneut versuchen.',503);}
}
export async function POST(request:Request) {
 if(request.headers.get('origin')!==new URL(request.url).origin) return fail('Ungültige Anfrage.',403);
 if(Number(request.headers.get('content-length')||0)>5500000) return fail('Das Bild darf höchstens 5 MB groß sein.',413);
 let imageKey:string|null=null;
 try {
  const form=await request.formData();
  const str=(key:string,max:number)=>String(form.get(key)||'').trim().slice(0,max);
  const requester=str('requester',100),name=str('name',100),unit=str('unit',30)||'Stück',token=str('requestKey',100),quantity=Number(form.get('quantity'));
  if(!requester||!name||!Number.isInteger(quantity)||quantity<1||quantity>100000||!/^[a-zA-Z0-9-]{10,100}$/.test(token)) return fail('Bitte deinen Namen, Artikel und eine gültige ganze Menge eingeben.');
  const db=portalDB();
  if(await db.prepare('SELECT id FROM portal_wishes WHERE request_key=?').bind(token).first()) return Response.json({ok:true});
  const recent=await db.prepare('SELECT COUNT(*) AS n FROM portal_wishes WHERE created_at>?').bind(Date.now()-60000).first<{n:number}>();
  if((recent?.n||0)>=20)return fail('Gerade kommen viele Wünsche an. Bitte in einer Minute erneut versuchen.',429);
  const data=await portalCatalog(),existing=data.materials.find(m=>keyForName(m.name)===keyForName(name));
  if(existing?.stock) return fail('Für diesen Artikel ist bereits Bestand hinterlegt. Schau bitte in der Materialsuche nach.');
  const photo=form.get('photo');
  if(photo instanceof File&&photo.size){
   if(photo.size>5*1024*1024)return fail('Das Bild darf höchstens 5 MB groß sein.');
   const bytes=new Uint8Array(await photo.arrayBuffer());
   const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
   const png=[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
   const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
   if(!jpeg&&!png&&!webp)return fail('Bitte ein JPG-, PNG- oder WebP-Bild auswählen.');
   if(!env.BUCKET)throw new Error('Bildspeicher nicht verfügbar');
   imageKey=crypto.randomUUID();await env.BUCKET.put('portal/'+imageKey,bytes,{httpMetadata:{contentType:jpeg?'image/jpeg':png?'image/png':'image/webp'}});
  }
  const savedName=existing?.name||name;
  await db.batch([
   db.prepare("INSERT INTO materials (name,unit,stock,location,note,packed,consumable) SELECT ?,?,0,'','',0,1 WHERE NOT EXISTS (SELECT 1 FROM materials WHERE name=?)").bind(savedName,unit,savedName),
   db.prepare('INSERT OR IGNORE INTO portal_wishes (material_id,requester,quantity,unit,image_key,request_key,created_at) VALUES ((SELECT id FROM materials WHERE name=? ORDER BY id LIMIT 1),?,?,?,?,?,?)').bind(savedName,requester,quantity,unit,imageKey,token,Date.now())
  ]);
  return Response.json({ok:true});
 }catch(e){if(imageKey&&env.BUCKET)await env.BUCKET.delete('portal/'+imageKey).catch(()=>{});console.error('portal wish',e);return fail('Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten. Bitte erneut versuchen.',503);}
}
