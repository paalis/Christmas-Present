(() => {
  const C = window.CFG || {};
  const D = window.Dato;
  const R = window.Regler(C);
  const $ = (s) => document.querySelector(s);
  const LAGER = "hold-av-valg";

  /* ---------- tekst ---------- */
  const [tittel, ...resten] = String(C.hilsen || "Hei!").split("\n");
  $("#heroTitle").textContent = tittel;
  $("#greeting").textContent = resten.join(" ") + " ";
  if (C.smil !== false) $("#greeting").insertAdjacentHTML("beforeend", '<svg class="smil" aria-hidden="true"><use href="#i-smil"/></svg>');
  $("#toName").textContent = `Til ${C.navn || "deg"}`;
  $("#calSub").textContent = C.kalenderTekst || "Trykk på første dag, og deretter siste dag.";

  const show = (id) => {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo(0, 0);
  };

  /* ---------- forslag + reserver ---------- */
  const [forslag, ...reserver] = R.ferdige;
  const sugBox = $("#sugBox");
  if (forslag) {
    $("#sugText").textContent = D.cap(D.range(forslag[0], forslag[1]));
    const [a0, b0] = forslag;
    const sammeMnd = a0.getUTCMonth() === b0.getUTCMonth() && a0.getUTCFullYear() === b0.getUTCFullYear();
    $("#sugBig").textContent = sammeMnd ? `${a0.getUTCDate()}.–${b0.getUTCDate()}.` : `${D.short(a0)}–${D.short(b0)}`;
    $("#sugMonth").textContent = sammeMnd ? D.month(a0) : String(b0.getUTCFullYear());
    $("#sugBtn").addEventListener("click", () => send(forslag[0], forslag[1], "forslag"));
    const alts = $("#alts");
    reserver.forEach(([a, b]) => {
      const btn = document.createElement("button");
      btn.className = "alt-btn";
      btn.textContent = D.cap(D.range(a, b));
      btn.addEventListener("click", () => send(a, b, "reserve"));
      alts.appendChild(btn);
    });
    $("#altsWrap").hidden = reserver.length === 0;
  } else sugBox.hidden = true;

  /* ---------- kalender ---------- */
  let start = null, end = null, hover = null;
  const first = forslag ? forslag[0] : R.min;
  let view = D.ym(first.getUTCFullYear(), first.getUTCMonth());
  const daysEl = $("#days");
  const sugDays = new Set();
  R.ferdige.forEach(([a, b]) => { for (let d = a; d <= b; d = D.add(d, 1)) sugDays.add(D.iso(d)); });

  function render() {
    $("#monthLabel").textContent = D.month(view);
    $("#prev").disabled = view <= D.ym(R.min.getUTCFullYear(), R.min.getUTCMonth());
    $("#next").disabled = view >= D.ym(R.max.getUTCFullYear(), R.max.getUTCMonth());

    const sel = start && end ? [start, end] : null;
    const prev = !sel && start && hover && R.kanSlutte(start, hover) ? [start, hover] : null;
    const y = view.getUTCFullYear(), m = view.getUTCMonth();
    const lead = (D.weekday(view) + 6) % 7;
    const count = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < lead; i++) {
      const b = document.createElement("span"); b.className = "day blank"; frag.appendChild(b);
    }
    for (let i = 1; i <= count; i++) {
      const d = new Date(Date.UTC(y, m, i));
      const btn = document.createElement("button");
      btn.className = "day";
      btn.innerHTML = `<b>${i}</b>`;
      btn.dataset.date = D.iso(d);
      btn.disabled = !(start && !end ? +d === +start || R.kanSlutte(start, d) || R.kanStarte(d) : R.kanStarte(d));
      if (sugDays.has(D.iso(d))) btn.classList.add("sug");
      const r = sel || prev;
      if (r && d >= r[0] && d <= r[1]) {
        btn.classList.add("in");
        if (+d === +r[0]) btn.classList.add("start");
        if (+d === +r[1]) btn.classList.add("end");
      } else if (start && +d === +start) btn.classList.add("start", "end");
      const valgt = btn.classList.contains("start") || btn.classList.contains("end");
      btn.setAttribute("aria-label", D.long(d) + (valgt ? ", valgt" : ""));
      btn.setAttribute("aria-pressed", valgt);
      frag.appendChild(btn);
    }
    daysEl.replaceChildren(frag);

    const mangler = !!sel && R.trengerKommentar(sel[0], sel[1]) && !$("#comment").value.trim();
    $("#confirm").disabled = !sel || sending || mangler;
    $("#commentHint").hidden = !mangler;
    $("#commentLabel").textContent = sel && R.trengerKommentar(sel[0], sel[1]) ? "Kommentar (må fylles ut)" : "Kommentar";
    $("#selText").textContent = sel ? `${D.short(sel[0])} – ${D.short(sel[1])}`
      : start ? "Velg siste dag …" : "Ingen dato valgt ennå";
  }

  daysEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".day:not(:disabled)");
    if (!btn || sending) return;
    const d = D.parse(btn.dataset.date);
    if (!start || end) { start = d; end = null; }
    else if (+d === +start) { start = null; }
    else if (R.kanSlutte(start, d)) { end = d; }
    else { start = d; end = null; }
    hover = null;
    clearError();
    render();
  });
  daysEl.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const btn = e.target.closest(".day:not(:disabled)");
    const d = btn ? D.parse(btn.dataset.date) : null;
    if (+d !== +hover) { hover = d; render(); }
  });
  daysEl.addEventListener("pointerleave", () => { if (hover) { hover = null; render(); } });
  $("#prev").addEventListener("click", () => { view = D.ym(view.getUTCFullYear(), view.getUTCMonth() - 1); render(); });
  $("#next").addEventListener("click", () => { view = D.ym(view.getUTCFullYear(), view.getUTCMonth() + 1); render(); });
  $("#confirm").addEventListener("click", () => { if (start && end) send(start, end, "kalender"); });
  $("#comment").addEventListener("input", () => render());

  /* ---------- sending ---------- */
  let sending = false;
  let pending = null; // { key, id } – samme id ved nytt forsøk på samme valg

  const newId = () => (crypto.randomUUID ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join(""));

  function setBusy(on, label) {
    sending = on;
    document.querySelectorAll("#sugBtn, .alt-btn, #confirm").forEach((b) => { b.disabled = on; });
    if (on && label) label.dataset.text = label.textContent, label.textContent = "Sender …";
    if (!on) document.querySelectorAll("[data-text]").forEach((b) => { b.textContent = b.dataset.text; delete b.dataset.text; });
    if (!on) render();
  }
  function showError(msg) { const el = $("#error"); el.textContent = msg; el.hidden = false; el.scrollIntoView({ block: "center", behavior: "smooth" }); }
  function clearError() { $("#error").hidden = true; }

  async function send(s, e, kilde) {
    const comment = $("#comment").value.trim().slice(0, 500);
    if (sending || !R.gyldig(s, e) || (R.trengerKommentar(s, e) && !comment)) return;
    const key = `${D.iso(s)}|${D.iso(e)}|${comment}`;
    if (!pending || pending.key !== key) pending = { key, id: newId() };
    const btn = kilde === "forslag" ? $("#sugBtn") : kilde === "kalender" ? $("#confirm") : null;
    clearError();
    setBusy(true, btn);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pending.id, start: D.iso(s), end: D.iso(e), comment, kilde }),
      });
      if (!res.ok) throw new Error(String(res.status));
      try { localStorage.setItem(LAGER, JSON.stringify({ s: D.iso(s), e: D.iso(e), c: comment })); } catch {}
      pending = null;
      setBusy(false);
      showDone(s, e, comment);
    } catch {
      setBusy(false);
      showError("Oi, det gikk ikke å sende akkurat nå. Sjekk nettet og prøv igjen.");
    }
  }

  function showDone(s, e, comment) {
    $("#fDep").textContent = D.cap(D.long(s));
    $("#fRet").textContent = D.cap(D.long(e));
    const fc = $("#fComment");
    fc.hidden = !comment;
    fc.textContent = comment ? `«${comment}»` : "";
    show("done");
  }

  $("#change").addEventListener("click", () => {
    try { localStorage.removeItem(LAGER); } catch {}
    start = end = null;
    show("pick");
    render();
  });

  /* ---------- oppstart ---------- */
  render();
  try {
    const saved = JSON.parse(localStorage.getItem(LAGER) || "null");
    const s = saved && D.parse(saved.s), e = saved && D.parse(saved.e);
    if (s && e) { $("#comment").value = saved.c || ""; showDone(s, e, saved.c); }
  } catch {}
})();
