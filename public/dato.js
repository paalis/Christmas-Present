/* Datohjelpere. Alle datoer er rene kalenderdatoer (ÅÅÅÅ-MM-DD) som
   regnes i UTC, så ukedager aldri forskyves av tidssone eller sommertid.
   «I dag» hentes fra Europe/Oslo. Brukes både i nettleseren og på serveren. */
(function (factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else window.Dato = api;
})(function () {
  const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DAY = 86400000;

  function parse(s) {
    const m = RE.exec(String(s || ""));
    if (!m) return null;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    const d = new Date(t);
    // avvis f.eks. 2027-02-30
    if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
    return d;
  }
  const iso = (d) => d.toISOString().slice(0, 10);
  const add = (d, n) => new Date(d.getTime() + n * DAY);
  const diff = (a, b) => Math.round((b - a) / DAY);
  const weekday = (d) => d.getUTCDay();
  const ym = (y, m) => new Date(Date.UTC(y, m, 1));

  function today(tz = "Europe/Oslo") {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return parse(p);
  }

  const fmtLong = new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fmtNoYear = new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
  const fmtShort = new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", day: "numeric", month: "short" });
  const fmtMonth = new Intl.DateTimeFormat("nb-NO", { timeZone: "UTC", month: "long", year: "numeric" });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  return {
    parse, iso, add, diff, weekday, ym, today, cap,
    long: (d) => fmtLong.format(d),
    noYear: (d) => fmtNoYear.format(d),
    short: (d) => fmtShort.format(d).replace(/\.$/, ""),
    month: (d) => fmtMonth.format(d),
    range: (a, b) => a.getUTCFullYear() === b.getUTCFullYear()
      ? `${fmtNoYear.format(a)} – ${fmtLong.format(b)}`
      : `${fmtLong.format(a)} – ${fmtLong.format(b)}`,
  };
});
