// POST /api/send – tar imot valgte datoer, varsler via ntfy og lagrer en kopi i Vercel Blob.
// Emnenavnet ligger kun i miljøvariabelen NTFY_TOPIC og sendes aldri til nettleseren.
const { put, head, BlobNotFoundError } = require("@vercel/blob");
const cfg = require("../public/config.js");
const D = require("../public/dato.js");
const lagRegler = require("../public/regler.js");

const ID_RE = /^[a-zA-Z0-9-]{16,64}$/;

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

function reply(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function notify(text, title) {
  const topic = process.env.NTFY_TOPIC;
  if (!topic) throw new Error("NTFY_TOPIC mangler");
  const r = await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers: { Title: title, Tags: "date", Priority: "high" },
    body: text,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`ntfy ${r.status}`);
}

async function handler(req, res, deps = {}) {
  const blob = { put: deps.put || put, head: deps.head || head };
  const send = deps.notify || notify;
  const now = deps.today || D.today();

  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return reply(res, 405, { ok: false }); }

  let body;
  try { body = await readJson(req); } catch { return reply(res, 400, { ok: false, error: "json" }); }

  const id = String(body.id || "");
  const s = D.parse(body.start), e = D.parse(body.end);
  const comment = String(body.comment || "").slice(0, 500);
  const kilde = ["forslag", "reserve", "kalender"].includes(body.kilde) ? body.kilde : "kalender";
  if (!ID_RE.test(id) || !s || !e || !lagRegler(cfg, now).gyldig(s, e)) {
    return reply(res, 422, { ok: false, error: "ugyldig" });
  }
  if (lagRegler(cfg, now).trengerKommentar(s, e) && !comment.trim()) {
    return reply(res, 422, { ok: false, error: "kommentar" });
  }

  const path = `svar/${id}.json`;
  // Allerede mottatt (f.eks. dobbelttrykk eller nytt forsøk etter tidsavbrudd)?
  try { await blob.head(path); return reply(res, 200, { ok: true, duplikat: true }); }
  catch (err) { if (!(err instanceof BlobNotFoundError) && err.name !== "BlobNotFoundError") console.error("blob head", err.message); }

  const name = cfg.navn || "Hun";
  const lines = [
    kilde === "forslag" ? "Forslaget ditt passer! 🎉" : kilde === "reserve" ? "Hun valgte reservehelgen." : "Hun valgte selv i kalenderen.",
    `Fra: ${D.cap(D.long(s))}`,
    `Til: ${D.cap(D.long(e))}`,
  ];
  if (comment) lines.push("", `«${comment}»`);
  const text = lines.join("\n");
  const record = { id, start: D.iso(s), end: D.iso(e), comment, kilde, mottatt: new Date().toISOString() };

  // Siste utvei: alltid i Vercel-loggene.
  console.log("SVAR", JSON.stringify(record));

  const [varsel, lagret] = await Promise.allSettled([
    send(text, `${name} har holdt av datoer`.normalize("NFC")),
    blob.put(path, JSON.stringify(record, null, 2), {
      access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: false,
    }),
  ]);
  if (varsel.status === "rejected") console.error("ntfy feilet", varsel.reason && varsel.reason.message);
  if (lagret.status === "rejected") console.error("blob feilet", lagret.reason && lagret.reason.message);

  // Svaret regnes som levert når det enten er varslet eller trygt lagret.
  if (varsel.status === "fulfilled" || lagret.status === "fulfilled") {
    return reply(res, 200, { ok: true });
  }
  return reply(res, 502, { ok: false, error: "levering" });
}

module.exports = (req, res) => handler(req, res);
module.exports.handler = handler;
