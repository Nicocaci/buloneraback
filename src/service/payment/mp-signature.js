import crypto from "crypto";

// Lee el header x-signature de Mercado Pago: "ts=1704908010,v1=618c8534..."
export function parsearFirma(xSignature) {
  const partes = {};
  for (const parte of String(xSignature || "").split(",")) {
    const [clave, ...resto] = parte.split("=");
    if (clave && resto.length) partes[clave.trim()] = resto.join("=").trim();
  }
  return { ts: partes.ts, v1: partes.v1 };
}

// Arma el texto firmado: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
// Si alguno de los valores no viene en la notificación, se omite su parte.
// El data.id va en minúsculas (Mercado Pago lo indica para IDs alfanuméricos).
export function armarManifest({ dataId, xRequestId, ts }) {
  let manifest = "";
  if (dataId) manifest += `id:${String(dataId).toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  if (ts) manifest += `ts:${ts};`;
  return manifest;
}

// Verifica que la notificación venga de Mercado Pago (HMAC-SHA256 con la clave secreta de webhooks).
export function verificarFirmaMP({ xSignature, xRequestId, dataId, secret }) {
  const { ts, v1 } = parsearFirma(xSignature);
  if (!ts || !v1 || !secret) return false;

  const esperado = crypto
    .createHmac("sha256", secret)
    .update(armarManifest({ dataId, xRequestId, ts }))
    .digest("hex");

  const a = Buffer.from(esperado, "utf8");
  const b = Buffer.from(String(v1).toLowerCase(), "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
