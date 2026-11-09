/* Felles regler for hvilke datoer som kan velges. Brukes i nettleseren og i /api/send. */
(function (factory) {
  if (typeof module !== "undefined" && module.exports) module.exports = factory(require("./dato.js"));
  else window.Regler = factory(window.Dato);
})(function (D) {
  return function lag(cfg, idag) {
    idag = idag || D.today();
    let min = D.parse(cfg.tidligsteDato) || D.add(idag, 1);
    if (min < idag) min = idag;
    const max = D.parse(cfg.senesteDato) || D.add(idag, 365);
    const minL = cfg.minLengde || 1;
    const maxL = cfg.maksLengde || 30;

    const sperret = new Set();
    (cfg.utilgjengelig || []).forEach((e) => {
      const [a, b] = String(e).split("/");
      const fra = D.parse(a), til = D.parse(b || a);
      if (!fra || !til) return;
      for (let d = fra; d <= til; d = D.add(d, 1)) sperret.add(D.iso(d));
    });

    const ledig = (d) => d >= min && d <= max && !sperret.has(D.iso(d));
    const ledigSpenn = (a, b) => { for (let d = a; d <= b; d = D.add(d, 1)) if (!ledig(d)) return false; return true; };
    const kanStarte = (d) => ledig(d) && (!cfg.startdager || cfg.startdager.includes(D.weekday(d)));
    const kanSlutte = (s, e) => { const n = D.diff(s, e); return n >= minL && n <= maxL && ledigSpenn(s, e); };

    const ferdige = [cfg.forslag, ...(cfg.reserver || [])]
      .filter((p) => Array.isArray(p) && p.length === 2)
      .map(([a, b]) => [D.parse(a), D.parse(b)])
      .filter(([a, b]) => a && b && b >= a);
    const erFerdig = (s, e) => ferdige.some(([a, b]) => +a === +s && +b === +e);

    // Et valg er gyldig hvis det er et av forslagene, eller følger kalenderreglene.
    const gyldig = (s, e) => !!(s && e && (erFerdig(s, e) || (kanStarte(s) && kanSlutte(s, e))));

    return { min, max, ledig, kanStarte, kanSlutte, gyldig, ferdige };
  };
});
