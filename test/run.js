// Kjør: npm test   (krever Playwright for nettlesertestene)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const PUB = path.join(ROOT, "public");
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; process.stdout.write(`  ✓ ${name}\n`); }
  else { fail++; process.stdout.write(`  ✗ ${name} ${extra}\n`); }
};

/* 1. Ingen avslørende ord i noe som serveres */
console.log("\n1. Ordsjekk i public/ (innhold og filnavn)");
const WORD = /\b(tur|turen|turer|jul|julen|jule\w*|billett\w*|fly|flyet|flytur|reise\w*|ferie\w*|hotell\w*|dublin|irland|ireland|christmas|xmas|trip|travel|flight|ticket|mysteri\w*|natt|netter|overnatt\w*|avreise|hjemreise|destinasjon\w*)\b/i;
const files = fs.readdirSync(PUB);
for (const f of files) {
  ok(`filnavn ${f}`, !WORD.test(f.replace(/[._-]/g, " ")));
  if (/\.(html|js|css|txt)$/.test(f)) {
    const hits = fs.readFileSync(path.join(PUB, f), "utf8").split("\n")
      .map((l, i) => [i + 1, l]).filter(([, l]) => WORD.test(l));
    ok(`innhold ${f}`, hits.length === 0, JSON.stringify(hits));
  }
}
ok("ingen emoji eller symboltegn i public/", !files.filter((f) => /\.(html|js|css)$/.test(f)).some((f) => /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}]/u.test(fs.readFileSync(path.join(PUB, f), "utf8"))));
ok("ingen ntfy-emne i public/", !files.some((f) => /ntfy|NTFY_TOPIC/i.test(fs.readFileSync(path.join(PUB, f), "latin1"))));

/* 2. Datoer og ukedager – samme svar i flere tidssoner */
console.log("\n2. Datoer i ulike tidssoner");
const probe = `
const D=require('${PUB}/dato.js'); const R=require('${PUB}/regler.js')(require('${PUB}/config.js'), D.parse('2026-11-09'));
const p=D.parse;
console.log(JSON.stringify({
  wd: [p('2027-01-07'),p('2027-01-21'),p('2027-03-25'),p('2027-03-28'),p('2027-10-31')].map(D.weekday),
  bad: [p('2027-02-30'),p('2027-13-01'),p('x'),p('')].map(x=>x===null),
  long: D.long(p('2027-01-21')), range: D.range(p('2027-01-21'),p('2027-01-24')),
  g: [R.gyldig(p('2027-01-21'),p('2027-01-24')), R.gyldig(p('2027-01-07'),p('2027-01-10')),
      R.gyldig(p('2027-03-25'),p('2027-03-29')), R.gyldig(p('2027-01-22'),p('2027-01-25')),
      R.gyldig(p('2027-01-21'),p('2027-01-23')), R.gyldig(p('2027-01-21'),p('2027-01-26')),
      R.gyldig(p('2027-07-01'),p('2027-07-04'))]
}));`;
const results = ["UTC", "Europe/Oslo", "America/Los_Angeles", "Pacific/Kiritimati"].map((tz) => [tz,
  JSON.parse(execFileSync(process.execPath, ["-e", probe], { env: { ...process.env, TZ: tz } }).toString())]);
const ref = JSON.stringify(results[0][1]);
results.forEach(([tz, r]) => ok(`lik oppførsel i ${tz}`, JSON.stringify(r) === ref, JSON.stringify(r)));
const r0 = results[0][1];
ok("ukedager to/to/to/sø/sø", JSON.stringify(r0.wd) === "[4,4,4,0,0]", JSON.stringify(r0.wd));
ok("ugyldige datoer avvises", r0.bad.every(Boolean));
ok("norsk formatering", r0.long === "torsdag 21. januar 2027", r0.long);
ok("periode-tekst", r0.range === "torsdag 21. januar – søndag 24. januar 2027", r0.range);
ok("regler: forslag, reserve, to–ma over sommertid ok; fre-start, for kort, for lang, utenfor periode avvist",
  JSON.stringify(r0.g) === "[true,true,true,false,false,false,false]", JSON.stringify(r0.g));

/* 3. Serverfunksjonen med simulerte tjenester */
async function apiTests() {
  console.log("\n3. /api/send");
  const { handler } = require(path.join(ROOT, "api/send.js"));
  const D = require(path.join(PUB, "dato.js"));
  class NotFound extends Error { constructor() { super("nf"); this.name = "BlobNotFoundError"; } }
  const call = async (body, deps, method = "POST") => {
    const res = { statusCode: 0, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
    await handler({ method, body }, res, { today: D.parse("2026-11-09"), ...deps });
    return { status: res.statusCode, json: JSON.parse(res.body) };
  };
  const id = "0123456789abcdef0123";
  const good = { id, start: "2027-01-21", end: "2027-01-24", comment: "hei", kilde: "forslag" };
  const mk = (o = {}) => {
    const log = { notify: [], put: [] };
    return { log, deps: {
      head: o.head || (async () => { throw new NotFound(); }),
      put: async (p, b) => { log.put.push([p, b]); if (o.putFail) throw new Error("x"); },
      notify: async (t, title) => { log.notify.push([t, title]); if (o.ntfyFail) throw new Error("x"); },
    } };
  };
  const quiet = console.log, qe = console.error; console.log = () => {}; console.error = () => {};
  try {
    let m = mk(); let r = await call(good, m.deps);
    ok("gyldig svar → 200, varsel + lagring", r.status === 200 && m.log.notify.length === 1 && m.log.put.length === 1);
    ok("varsel inneholder datoer og kommentar", /torsdag 21\. januar 2027/i.test(m.log.notify[0][0]) && /hei/.test(m.log.notify[0][0]));
    ok("tittel er gyldig header-tekst (latin1)", /^[\x20-\xff]+$/.test(m.log.notify[0][1]), m.log.notify[0][1]);
    ok("svaret til nettleseren røper ikke emnet", !JSON.stringify(r.json).includes(process.env.NTFY_TOPIC || "§§"));
    m = mk({ head: async () => ({}) }); r = await call(good, m.deps);
    ok("samme id to ganger → ingen nytt varsel", r.status === 200 && r.json.duplikat && m.log.notify.length === 0);
    m = mk({ ntfyFail: true }); r = await call(good, m.deps);
    ok("ntfy feiler, lagring ok → 200 (svaret er trygt)", r.status === 200 && m.log.put.length === 1);
    m = mk({ putFail: true }); r = await call(good, m.deps);
    ok("lagring feiler, ntfy ok → 200", r.status === 200);
    m = mk({ ntfyFail: true, putFail: true }); r = await call(good, m.deps);
    ok("begge feiler → 502 (hun får prøve igjen)", r.status === 502);
    r = await call({ ...good, start: "2027-01-22", end: "2027-01-25" }, mk().deps);
    ok("fredag-start avvises (422)", r.status === 422);
    m = mk(); r = await call({ ...good, comment: "" }, m.deps);
    ok("hovedforslaget uten kommentar → 200", r.status === 200 && m.log.notify.length === 1);
    m = mk(); r = await call({ ...good, start: "2027-01-14", end: "2027-01-17", comment: "  ", kilde: "kalender" }, m.deps);
    ok("andre datoer uten kommentar avvises (422), ingen varsel", r.status === 422 && r.json.error === "kommentar" && m.log.notify.length === 0);
    m = mk(); r = await call({ ...good, start: "2027-01-14", end: "2027-01-17", comment: "Jobb den 21.", kilde: "kalender" }, m.deps);
    ok("andre datoer med kommentar → 200", r.status === 200 && m.log.notify.length === 1);
    r = await call({ ...good, id: "x" }, mk().deps);
    ok("ugyldig id avvises (422)", r.status === 422);
    r = await call(good, mk().deps, "GET");
    ok("GET → 405", r.status === 405);
  } finally { console.log = quiet; console.error = qe; }
}

/* 4. Nettleser */
async function browserTests() {
  console.log("\n4. Nettleser (Playwright, iPhone-størrelse, Europe/Oslo og New York)");
  let chromium; try { ({ chromium } = require("playwright")); } catch { console.log("  – hopper over: Playwright mangler"); return; }
  const srv = http.createServer((req, res) => {
    const f = path.join(PUB, decodeURIComponent(req.url.split("?")[0]) === "/" ? "index.html" : req.url.split("?")[0]);
    if (!f.startsWith(PUB) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".txt": "text/plain" };
    res.setHeader("Content-Type", types[path.extname(f)] || "application/octet-stream");
    res.end(fs.readFileSync(f));
  }).listen(0);
  const base = `http://localhost:${srv.address().port}/`;
  const b = await chromium.launch();
  try {
    for (const tz of ["Europe/Oslo", "America/New_York"]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, timezoneId: tz, locale: "nb-NO" });
      const p = await ctx.newPage();
      const errs = []; p.on("pageerror", (e) => errs.push(e.message));
      const reqs = []; let mode = "fail";
      await p.route("**/fonts.*/**", (r) => r.abort());
      await p.route("**/api/send", async (r) => {
        reqs.push(JSON.parse(r.request().postData()));
        await new Promise((x) => setTimeout(x, 300));
        r.fulfill({ status: mode === "fail" ? 502 : 200, contentType: "application/json", body: '{"ok":true}' });
      });
      await p.goto(base);
      const enabled = await p.$$eval("#days button.day:not(:disabled)", (e) => e.map((x) => x.dataset.date));
      ok(`[${tz}] bare torsdager kan velges i januar`, JSON.stringify(enabled) === '["2027-01-07","2027-01-14","2027-01-21","2027-01-28"]', JSON.stringify(enabled));
      ok(`[${tz}] forslagstekst`, (await p.textContent("#sugText")) === "Torsdag 21. januar – søndag 24. januar 2027");
      ok(`[${tz}] ingen reserveknapp`, (await p.$$(".alt-btn")).length === 0 && await p.isHidden("#altsWrap"));

      await p.click("#sugBtn"); await p.click("#sugBtn", { force: true }).catch(() => {});
      await p.waitForSelector("#error:not([hidden])");
      ok(`[${tz}] feil → vennlig melding, ikke «Tusen takk»`, !(await p.isVisible("#done")) && /prøv igjen/.test(await p.textContent("#error")));
      ok(`[${tz}] dobbeltrykk sender bare én gang`, reqs.length === 1, String(reqs.length));
      mode = "ok"; await p.click("#sugBtn"); await p.waitForSelector("#done.active");
      ok(`[${tz}] nytt forsøk bruker samme id`, reqs.length === 2 && reqs[0].id === reqs[1].id);
      ok(`[${tz}] «Tusen takk!» etter sendt`, /Tusen takk!/.test(await p.textContent("#done")));
      ok(`[${tz}] bekreftet dato`, (await p.textContent("#fDep")) === "Torsdag 21. januar 2027");

      await p.reload(); ok(`[${tz}] husker valget ved ny visning`, await p.isVisible("#done.active"));
      await p.click("#change");
      await p.fill("#comment", "");
      await p.click('[data-date="2027-01-14"]'); await p.click('[data-date="2027-01-18"]');
      ok(`[${tz}] andre datoer: knapp låst uten kommentar`, await p.isDisabled("#confirm") && await p.isVisible("#commentHint"));
      ok(`[${tz}] etikett sier «må fylles ut»`, (await p.textContent("#commentLabel")) === "Kommentar (må fylles ut)");
      await p.fill("#comment", "   ");
      ok(`[${tz}] bare mellomrom teller ikke`, await p.isDisabled("#confirm"));
      await p.fill("#comment", "Gleder meg");
      ok(`[${tz}] knapp åpnes med kommentar`, await p.isEnabled("#confirm") && await p.isHidden("#commentHint"));
      await p.click("#confirm"); await p.waitForSelector("#done.active");
      const last = reqs.at(-1);
      ok(`[${tz}] egen kalendervalg to–ma sendes riktig`, last.start === "2027-01-14" && last.end === "2027-01-18" && last.comment === "Gleder meg");

      const body = await p.evaluate(() => document.documentElement.outerHTML);
      ok(`[${tz}] ingen avslørende ord i ferdig side`, !WORD.test(body.replace(/<[^>]+>/g, " ")));
      ok(`[${tz}] ingen JS-feil`, errs.length === 0, errs.join("; "));
      await ctx.close();
    }
    const p = await b.newPage();
    await p.goto(base);
    const meta = await p.evaluate(() => Object.fromEntries([...document.querySelectorAll("meta[name],meta[property]")].map((m) => [m.getAttribute("name") || m.getAttribute("property"), m.content])));
    ok("noindex-meta", meta.robots === "noindex, nofollow");
    ok("Open Graph-tagger", meta["og:title"] === "Hold av noen datoer?" && /og\.png$/.test(meta["og:image"]));
    ok("tittel", (await p.title()) === "Hold av noen datoer?");
    ok("robots.txt", /Disallow: \//.test(fs.readFileSync(path.join(PUB, "robots.txt"), "utf8")));
    const vj = JSON.parse(fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8"));
    ok("X-Robots-Tag-header i vercel.json", JSON.stringify(vj.headers).includes("noindex"));
  } finally { await b.close(); srv.close(); }
}

(async () => {
  await apiTests();
  await browserTests();
  console.log(`\n${pass} bestått, ${fail} feilet`);
  process.exit(fail ? 1 : 0);
})();
