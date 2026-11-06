(() => {
  const C = window.TUR || {};
  const $ = (s) => document.querySelector(s);
  const STORE = "julebillett-valg";

  /* ---------- datohjelpere (lokal tid, ingen tidssone-overraskelser) ---------- */
  const MONTHS = ["januar","februar","mars","april","mai","juni","juli","august","september","oktober","november","desember"];
  const DAYS = ["søndag","mandag","tirsdag","onsdag","torsdag","fredag","lørdag"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diffDays = (a, b) => Math.round((b - a) / 86400000);
  const fmt = (d) => `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const fmtShort = (d) => `${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}`;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  let min = C.tidligsteDato ? parse(C.tidligsteDato) : addDays(today, 1);
  if (min < today) min = today;
  const max = C.senesteDato ? parse(C.senesteDato) : addDays(today, 365);
  const fixed = Number.isInteger(C.netter) && C.netter > 0 ? C.netter : null;
  const minN = fixed || C.minNetter || 1;
  const maxN = fixed || C.maksNetter || 30;

  const blocked = new Set();
  (C.utilgjengelig || []).forEach((entry) => {
    const [a, b] = String(entry).split("/");
    for (let d = parse(a), end = parse(b || a); d <= end; d = addDays(d, 1)) blocked.add(iso(d));
  });
  const free = (d) => d >= min && d <= max && !blocked.has(iso(d));
  const freeSpan = (a, b) => { for (let d = a; d <= b; d = addDays(d, 1)) if (!free(d)) return false; return true; };
  const canDepart = (d) => free(d) && (!C.avreisedager || C.avreisedager.includes(d.getDay()));
  const canTrip = (s) => canDepart(s) && freeSpan(s, addDays(s, fixed));

  /* ---------- fyll inn tekst fra config ---------- */
  document.querySelectorAll("[data-fill]").forEach((el) => { el.textContent = C[el.dataset.fill] || ""; });
  $("#greeting").textContent = C.hilsen || "Hei!";
  $("#calSub").textContent = C.kalenderTekst || (fixed
    ? `Trykk på dagen vi skal reise. Turen varer i ${fixed} ${fixed === 1 ? "natt" : "netter"}.`
    : `Trykk på avreisedag, og deretter hjemreisedag (${minN}–${maxN} netter).`);

  /* ---------- skjermer ---------- */
  const show = (id) => {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  };


  /* ---------- kalender ---------- */
  let start = null, end = null, hover = null;
  const sug = Array.isArray(C.forslag) && C.forslag.length === 2 ? C.forslag.map(parse) : null;
  const first = sug ? sug[0] : min;
  let view = new Date(first.getFullYear(), first.getMonth(), 1);
  const daysEl = $("#days");

  function rangeFor(s, e) {
    if (!s) return null;
    if (fixed) return [s, addDays(s, fixed)];
    return e ? [s, e] : null;
  }

  function validEnd(s, d) {
    const n = diffDays(s, d);
    return n >= minN && n <= maxN && freeSpan(s, d);
  }

  function render() {
    $("#monthLabel").textContent = `${MONTHS[view.getMonth()]} ${view.getFullYear()}`;
    $("#prev").disabled = view <= new Date(min.getFullYear(), min.getMonth(), 1);
    $("#next").disabled = view >= new Date(max.getFullYear(), max.getMonth(), 1);

    const sel = rangeFor(start, end);
    let prev = null;
    if (!sel && start && hover && validEnd(start, hover)) prev = [start, hover];
    if (fixed && hover && canTrip(hover) && (!start || +hover !== +start)) prev = [hover, addDays(hover, fixed)];

    const lead = (view.getDay() + 6) % 7;
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < lead; i++) {
      const b = document.createElement("span"); b.className = "day blank"; frag.appendChild(b);
    }
    for (let i = 1; i <= count; i++) {
      const d = new Date(view.getFullYear(), view.getMonth(), i);
      const btn = document.createElement("button");
      btn.className = "day";
      btn.innerHTML = `<b>${i}</b>`;
      btn.dataset.date = iso(d);

      let ok;
      if (fixed) ok = canTrip(d);
      else if (start && !end) ok = +d === +start || validEnd(start, d) || canDepart(d);
      else ok = canDepart(d);
      btn.disabled = !ok;

      const mark = (r, cls) => {
        if (!r || d < r[0] || d > r[1]) return;
        btn.classList.add(cls);
        if (+d === +r[0]) btn.classList.add("start");
        if (+d === +r[1]) btn.classList.add("end");
      };
      if (sug && d >= sug[0] && d <= sug[1]) btn.classList.add("sug");
      if (sel) mark(sel, "in");
      else if (start && +d === +start) btn.classList.add("start", "end");
      if (!sel || prev) mark(prev, prev && sel ? "preview" : "in");

      btn.setAttribute("aria-label", fmt(d) + (btn.classList.contains("start") ? ", valgt" : ""));
      btn.setAttribute("aria-pressed", btn.classList.contains("start") || btn.classList.contains("end"));
      frag.appendChild(btn);
    }
    daysEl.replaceChildren(frag);
    updateText();
  }

  function updateText() {
    const sel = rangeFor(start, end);
    $("#confirm").disabled = !sel;
    if (sel) {
      const n = diffDays(sel[0], sel[1]);
      $("#selText").textContent = `${fmtShort(sel[0])} → ${fmtShort(sel[1])} · ${n} ${n === 1 ? "natt" : "netter"} ✨`;
    } else if (start) {
      $("#selText").textContent = "Velg hjemreisedag …";
    } else {
      $("#selText").textContent = "Ingen dato valgt ennå";
    }
    if (sug) $("#sugBtn").classList.toggle("chosen", isSug(sel));
  }

  daysEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".day:not(:disabled)");
    if (!btn) return;
    const d = parse(btn.dataset.date);
    if (fixed) { start = d; end = null; }
    else if (!start || end) { start = d; end = null; }
    else if (+d === +start) { start = null; }
    else if (validEnd(start, d)) { end = d; }
    else { start = d; end = null; }
    hover = null;
    render();
  });
  daysEl.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const btn = e.target.closest(".day:not(:disabled)");
    const d = btn ? parse(btn.dataset.date) : null;
    if (+d !== +hover) { hover = d; render(); }
  });
  daysEl.addEventListener("pointerleave", () => { if (hover) { hover = null; render(); } });

  const isSug = (sel) => !!(sug && sel && +sel[0] === +sug[0] && +sel[1] === +sug[1]);
  if (sug) {
    $("#sugText").textContent = `${fmt(sug[0])} – ${fmt(sug[1])}`.replace(/ \d{4} –/, " –");
    $("#sugBtn").addEventListener("click", () => {
      start = sug[0]; end = fixed ? null : sug[1];
      view = new Date(sug[0].getFullYear(), sug[0].getMonth(), 1);
      render();
      $("#confirm").click();
    });
  } else $("#sugBox").hidden = true;

  $("#prev").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
  $("#next").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });

  /* ---------- bekreft + send ---------- */
  function message(sel, comment) {
    const n = diffDays(sel[0], sel[1]);
    let msg = `✈️ Datoene er valgt${isSug(sel) ? " (forslaget ditt passer!)" : ""}\nAvreise: ${fmt(sel[0])}\nHjemreise: ${fmt(sel[1])} (${n} netter)`;
    if (comment) msg += `\n\n«${comment}»`;
    return msg;
  }

  function showDone(sel, comment, fromStore) {
    $("#fDep").textContent = fmt(sel[0]);
    $("#fRet").textContent = fmt(sel[1]);
    const fc = $("#fComment");
    fc.hidden = !comment;
    fc.textContent = comment ? `«${comment}»` : "";

    const msg = message(sel, comment);
    const actions = $("#actions");
    actions.replaceChildren();
    const add = (html, attrs, alt) => {
      const el = document.createElement(attrs.href ? "a" : "button");
      el.innerHTML = html;
      Object.assign(el, attrs);
      if (alt) el.className = "alt";
      actions.appendChild(el);
      return el;
    };
    if (C.telefon) add("💬 Send som SMS", { href: `sms:${C.telefon}?&body=${encodeURIComponent(msg)}` });
    if (C.epost) add("✉️ Send på e-post", { href: `mailto:${C.epost}?subject=${encodeURIComponent("Datoene til turen ✈️")}&body=${encodeURIComponent(msg)}` }, !!C.telefon);
    if (navigator.share) add("📤 Del svaret", { onclick: () => navigator.share({ text: msg }).catch(() => {}) }, true);
    else if (!C.telefon && !C.epost) add("📋 Kopier svaret", {
      onclick: (e) => navigator.clipboard.writeText(msg).then(() => { e.currentTarget.textContent = "Kopiert ✓"; }),
    }, true);

    const status = $("#status");
    status.textContent = "";
    const sends = [];
    if (C.formspree) sends.push(() => fetch(C.formspree, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ avreise: iso(sel[0]), hjemreise: iso(sel[1]), hilsen: comment, melding: msg }),
    }));
    if (C.ntfy) sends.push(() => fetch(`https://ntfy.sh/${encodeURIComponent(C.ntfy)}`, {
      method: "POST",
      headers: { Title: `${C.til || "Hun"} har valgt datoer!`, Tags: "airplane,tada", Priority: "high" },
      body: msg,
    }));
    if (sends.length && fromStore) {
      status.textContent = "✓ Svaret ditt er allerede levert.";
    } else if (sends.length) {
      status.textContent = "Sender …";
      Promise.allSettled(sends.map((f) => f().then((r) => { if (!r.ok) throw 0; })))
        .then((res) => {
          if (res.some((r) => r.status === "fulfilled")) {
            status.textContent = "✓ Svaret er levert! Du trenger ikke gjøre mer.";
            $("#sendSub").textContent = "Vil du si det selv også?";
          } else status.textContent = "Klarte ikke sende automatisk – bruk en knapp under.";
        });
    }
    show("done");
  }

  $("#confirm").addEventListener("click", () => {
    const sel = rangeFor(start, end);
    if (!sel) return;
    const comment = $("#comment").value.trim();
    try { localStorage.setItem(STORE, JSON.stringify({ s: iso(sel[0]), e: iso(sel[1]), c: comment })); } catch {}
    showDone(sel, comment, false);
  });

  $("#change").addEventListener("click", () => {
    try { localStorage.removeItem(STORE); } catch {}
    show("pick");
    render();
  });

  /* ---------- oppstart ---------- */
  render();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved) {
      start = parse(saved.s); end = fixed ? null : parse(saved.e);
      $("#comment").value = saved.c || "";
      view = new Date(start.getFullYear(), start.getMonth(), 1);
      render();
      showDone([parse(saved.s), parse(saved.e)], saved.c, true);
    }
  } catch {}

  /* ---------- snø ---------- */
  const cv = $("#snow"), ctx = cv.getContext("2d");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let flakes = [];
  const resize = () => {
    cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    const n = Math.min(140, Math.round(innerWidth / 6));
    flakes = Array.from({ length: n }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      r: (Math.random() * 2.2 + .6) * devicePixelRatio, s: Math.random() * .6 + .3, w: Math.random() * Math.PI * 2,
    }));
  };
  resize(); addEventListener("resize", resize);
  (function tick() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (const f of flakes) {
      f.y += f.s * devicePixelRatio; f.w += .01; f.x += Math.sin(f.w) * .4 * devicePixelRatio;
      if (f.y > cv.height) { f.y = -5; f.x = Math.random() * cv.width; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
    }
    requestAnimationFrame(tick);
  })();
})();
