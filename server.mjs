import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
try {
  const envFile = readFileSync(path.join(root, '.env'), 'utf8');
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
} catch { /* Environment variables can be supplied by the host instead. */ }

const port = Number(process.env.PORT || 3000);
const token = process.env.SQUARE_ACCESS_TOKEN || '';
const locationId = process.env.SQUARE_LOCATION_ID || '';
const env = process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
const squareBase = env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
let catalog;
async function getCatalog() {
  if (!catalog) {
    const html = await readFile(path.join(root, 'index.html'), 'utf8');
    const match = html.match(/<script id="catalog-data" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) throw new Error('Catalog data was not found.');
    catalog = JSON.parse(match[1]);
  }
  return catalog;
}
function json(res, status, body) {
  const bytes = JSON.stringify(body);
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Content-Length':Buffer.byteLength(bytes)});
  res.end(bytes);
}
const attempts = new Map();
function rateLimited(req) {
  const now = Date.now();
  const key = req.socket.remoteAddress || 'unknown';
  const recent = (attempts.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now); attempts.set(key, recent);
  return recent.length > 10;
}
async function handleCheckout(req, res) {
  if (rateLimited(req)) return json(res, 429, {error:'Too many checkout attempts. Please wait and try again.'});
  if (!token || !locationId) return json(res, 503, {error:'Square checkout is not configured yet.'});
  let raw='';
  for await (const chunk of req) { raw += chunk; if (raw.length > 16_384) return json(res, 413, {error:'Cart is too large.'}); }
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { return json(res, 400, {error:'Invalid cart data.'}); }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 100) return json(res, 400, {error:'Choose products before checkout.'});
  const products = await getCatalog();
  const quantities = new Map();
  for (const line of body.items) {
    const id = Number(line?.id), quantity = Number(line?.quantity);
    if (!Number.isInteger(id) || id < 0 || id >= products.length || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) return json(res, 400, {error:'Invalid product or quantity.'});
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }
  const lineItems=[];
  for (const [id, quantity] of quantities) {
    const p=products[id];
    if (String(p.category).toLowerCase().includes('alcohol')) return json(res, 409, {error:`${p.name} cannot be purchased online until age checks and liquor retail permissions are confirmed.`});
    if (!p.squareId) return json(res, 409, {error:`${p.name} is missing its Square catalog ID.`});
    if (p.stock !== null && Number(p.stock) <= 0) return json(res, 409, {error:`${p.name} is currently out of stock.`});
    if (p.stock !== null && quantity > Number(p.stock)) return json(res, 409, {error:`Only ${p.stock} of ${p.name} were listed in the last stock snapshot.`});
    if (!Number.isFinite(Number(p.price))) return json(res, 409, {error:`${p.name} needs a confirmed price. Please call the store.`});
    lineItems.push({catalog_object_id:p.squareId,quantity:String(quantity)});
  }
  const payload={
    idempotency_key:randomUUID(),
    order:{location_id:locationId,line_items:lineItems},
    checkout_options:{accepted_payment_methods:{apple_pay:true,google_pay:true}}
  };
  let squareResponse;
  try {
    squareResponse=await fetch(`${squareBase}/v2/online-checkout/payment-links`,{
      method:'POST',headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json','Square-Version':'2026-09-16'},body:JSON.stringify(payload)
    });
  } catch { return json(res, 502, {error:'Could not reach Square. Please try again.'}); }
  const result=await squareResponse.json().catch(()=>({}));
  if (!squareResponse.ok) {
    console.error('Square checkout error', squareResponse.status, JSON.stringify(result.errors || []));
    return json(res, 502, {error:'Square could not create the payment page. Check Square account settings and try again.'});
  }
  const url=result.payment_link?.url;
  if (!url || !url.startsWith('https://')) return json(res,502,{error:'Square did not return a secure payment link.'});
  return json(res,200,{url});
}
const server=http.createServer(async(req,res)=>{
  try {
    const url=new URL(req.url,'http://localhost');
    if (req.method==='GET' && url.pathname==='/api/status') return json(res,200,{ready:Boolean(token && locationId),provider:'Square'});
    if (req.method==='POST' && url.pathname==='/api/square-checkout') return await handleCheckout(req,res);
    if (req.method==='GET' && (url.pathname==='/' || url.pathname==='/index.html')) {
      const file=await readFile(path.join(root,'index.html'));
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Content-Length':file.length,'Cache-Control':'no-store'});return res.end(file);
    }
    res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');
  } catch (error) { console.error('Server error',error);json(res,500,{error:'The store could not process this request.'}); }
});
server.listen(port,()=>console.log(`Pathibhara Trading is listening on port ${port} (${env})`));
