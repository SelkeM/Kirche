import { env } from 'cloudflare:workers';
import { portalDB } from '../../../../lib/portal-data';
import { isAdmin } from '../../../../lib/admin-auth';
export const runtime='edge';
export async function GET(request:Request){
 try{
 const key=new URL(request.url).searchParams.get('id')||'';
 if(!/^[a-f0-9-]{36}$/.test(key))return new Response(null,{status:404});
 const row=await portalDB().prepare('SELECT fulfilled_at FROM portal_wishes WHERE image_key=?').bind(key).first<{fulfilled_at:number|null}>();
 if(!row||(row.fulfilled_at!==null&&!await isAdmin()))return new Response(null,{status:404});
 const file=await env.BUCKET?.get('portal/'+key);if(!file)return new Response(null,{status:404});
 return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch(e){console.error('portal photo',e);return new Response(null,{status:503});}
}
