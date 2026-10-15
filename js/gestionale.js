// Gestionale MotoGP: dati dal sito + modifiche locali (salvate nel browser, esportabili in JSON).
(async function () {
  const $ = (s) => document.querySelector(s), M = $("#main");
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const slug = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const LS = "mgp_gest";
  // Modifiche salvate nel database SQLite del server (/api/gest); se il server non c'è, ripiego su localStorage
  let OV = {}, API = false;
  try { const r = await fetch("api/gest"); if (r.ok) { OV = await r.json(); API = true; } } catch {}
  if (!API) try { OV = JSON.parse(localStorage.getItem(LS) || "{}"); } catch {}
  for (const k of ["drivers", "teams", "races", "results"]) OV[k] ??= {};
  const persist = () => {
    if (!API) return localStorage.setItem(LS, JSON.stringify(OV));
    fetch("api/gest", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(OV) }).then((r) => { if (!r.ok) throw 0; }).catch(() => toast("Errore di salvataggio nel database"));
  };
  const toast = (m) => { const t = $("#ts"); t.textContent = m; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200); };
  const KC = { ducati: "#e10600", aprilia: "#7b2cbf", ktm: "#ff6600", honda: "#d7263d", yamaha: "#1d4ed8", gresini: "#1e6fd9", pramac: "#d4af37", vr46: "#c8f000", trackhouse: "#e4007c", lcr: "#e4002b", tech3: "#ff6600" };
  const tcol = (t) => t?.color || Object.entries(KC).find(([k]) => slug(t?.name).includes(k))?.[1] || "#8b90a0";

  // ---- dati base dal sito ----
  const L = (k) => MGP.load(k).catch(() => null);
  let BASE;
  async function loadBase() {
    const [ra, dr, re, sp] = await Promise.all(["races", "drivers", "results", "sprint"].map(L));
    BASE = { races: {}, drivers: {}, teams: {}, res: {} };
    for (const r of ra?.Races || []) BASE.races[r.round] = { id: r.round, name: r.raceName, date: r.date, circuit: r.Circuit.circuitName, country: r.Circuit.Location.country, sprint: !!r.Sprint };
    for (const d of dr?.Drivers || []) BASE.drivers[d.driverId] = { id: d.driverId, name: `${d.givenName} ${d.familyName}`, number: d.permanentNumber, nat: d.nationality, team: "", note: "" };
    const put = (l, suf) => (l?.Races || []).forEach((r) => {
      BASE.res[r.round + suf] = (r.Results || r.SprintResults || []).map((y) => {
        const c = y.Constructor;
        BASE.teams[c.name] ||= { name: c.name, color: c.color, make: c.make };
        if (BASE.drivers[y.Driver.driverId]) BASE.drivers[y.Driver.driverId].team = c.name;
        return { d: y.Driver.driverId, t: c.name, p: isNaN(+y.positionText) ? y.positionText : +y.positionText, pts: +y.points || 0 };
      });
    });
    put(re, ""); put(sp, "s");
  }
  // ---- dati effettivi (base + modifiche) ----
  const merged = (base, ov) => {
    const o = {};
    for (const k in base) if (!ov[k]?.del) o[k] = { ...base[k], ...ov[k] };
    for (const k in ov) if (!(k in base) && !ov[k].del) o[k] = ov[k];
    return o;
  };
  const E = () => ({
    drivers: merged(BASE.drivers, OV.drivers), teams: merged(BASE.teams, OV.teams), races: merged(BASE.races, OV.races),
    res: { ...BASE.res, ...OV.results },
  });
  function stand(e) {
    const D = {}, T = {};
    for (const k in e.res) for (const y of e.res[k]) {
      const d = (D[y.d] ??= { id: y.d, pts: 0, w: 0, pod: 0, n: 0 }), t = (T[y.t] ??= { name: y.t, pts: 0, w: 0 });
      d.pts += +y.pts || 0; t.pts += +y.pts || 0;
      if (!k.endsWith("s")) { d.n++; if (y.p === 1) { d.w++; t.w++; } if (y.p >= 1 && y.p <= 3) d.pod++; }
    }
    const s = (m) => Object.values(m).sort((a, b) => b.pts - a.pts || b.w - a.w);
    return { d: s(D), t: s(T) };
  }
  const av = (n, c) => `<span class="av" style="--c:${c}">${esc(String(n || "?").split(" ").map((x) => x[0]).slice(0, 2).join(""))}</span>`;

  // ---- componenti ----
  const S = { view: "dash", sort: {}, race: "", type: "" };
  function table(id, cols, rows, empty = "Nessun dato") {
    const q = ($("#q").value || "").toLowerCase(), so = S.sort[id];
    let r = rows.filter((x) => !q || x.s.toLowerCase().includes(q));
    if (so) r.sort((a, b) => { const x = a.v[so.i], y = b.v[so.i]; return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * so.d; });
    return `<div class="tw"><table data-t="${id}"><thead><tr>${cols.map((c, i) => `<th data-i="${i}" class="${so?.i === i ? (so.d > 0 ? "asc" : "desc") : ""}">${c}</th>`).join("")}</tr></thead><tbody>${r.map((x) => `<tr>${x.c.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" class="mut">${empty}</td></tr>`}</tbody></table></div>`;
  }
  const kpi = (l, v, s = "", c = "") => `<div class="kpi"${c ? ` style="--c:${c}"` : ""}><small>${l}</small><b>${v}</b><span>${s}</span></div>`;
  const bar = (n, v, mx, c, extra = "") => `<div class="br"><span>${n}</span><i><u style="width:${(v / (mx || 1)) * 100}%;background:${c}"></u></i><b>${v}</b>${extra}</div>`;
  function form(title, fields, vals, onSave) {
    const dg = $("#dg");
    dg.innerHTML = `<form method="dialog"><h3>${title}</h3>${fields.map((f) => `<label>${f.l}${f.type === "select" ? `<select name="${f.k}">${f.opts.map((o) => `<option value="${esc(o[0])}"${o[0] == vals[f.k] ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` : `<input name="${f.k}" type="${f.type || "text"}" value="${esc(vals[f.k] ?? "")}"${f.ro ? " readonly" : ""}${f.req ? " required" : ""}>`}</label>`).join("")}<div class="bt"><button value="x" class="gh" formnovalidate>Annulla</button><button value="ok" class="pr">Salva</button></div></form>`;
    dg.querySelector("form").onsubmit = (ev) => {
      if (ev.submitter?.value !== "ok") return;
      onSave(Object.fromEntries(new FormData(ev.target)));
    };
    dg.showModal();
  }
  function csv(name, head, rows) {
    const t = [head, ...rows].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    dl(name + ".csv", "text/csv;charset=utf-8", "\ufeff" + t);
  }
  function dl(n, type, data) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type })); a.download = n; a.click();
  }

  // ---- viste ----
  const V = {
    dash(e) {
      const st = stand(e), races = Object.values(e.races).sort((a, b) => a.date.localeCompare(b.date));
      const done = races.filter((r) => e.res[r.id]), nx = races.find((r) => !e.res[r.id]), last = done.at(-1);
      const nm = (id) => e.drivers[id]?.name || id, tm = (n) => ({ name: n, ...e.teams[n] }), mx = st.d[0]?.pts;
      const tot = st.d.reduce((a, b) => a + b.pts, 0);
      return `<div class="kpis">${kpi("Gare disputate", `${done.length}<em>/${races.length}</em>`, `${((done.length / (races.length || 1)) * 100) | 0}% stagione`)}${kpi("Leader piloti", esc(nm(st.d[0]?.id).split(" ").pop() || "-"), (st.d[0]?.pts ?? 0) + " pt", tcol(tm(e.drivers[st.d[0]?.id]?.team)))}${kpi("Leader squadre", esc(st.t[0]?.name?.split(" ")[0] || "-"), (st.t[0]?.pts ?? 0) + " pt", tcol(tm(st.t[0]?.name)))}${kpi("Piloti / Squadre", `${Object.keys(e.drivers).length}<em>/${Object.keys(e.teams).length}</em>`, "in anagrafica")}${kpi("Punti assegnati", tot, "gare + sprint")}</div>` +
        `<div class="two"><section class="pn"><h3>Top 10 piloti</h3>${st.d.slice(0, 10).map((d) => bar(esc(nm(d.id)), d.pts, mx, tcol(tm(e.drivers[d.id]?.team)))).join("") || '<p class="mut">Nessun risultato</p>'}</section>` +
        `<section class="pn"><h3>Classifica squadre</h3>${st.t.slice(0, 10).map((t) => bar(esc(t.name), t.pts, st.t[0].pts, tcol(tm(t.name)))).join("") || '<p class="mut">Nessun risultato</p>'}</section></div>` +
        `<div class="two"><section class="pn"><h3>Ultima gara</h3>${last ? `<p><b>${esc(last.name)}</b> <span class="mut">· ${esc(last.circuit)} · ${last.date}</span></p>${e.res[last.id].slice(0, 3).map((y) => `<div class="pd">${av(nm(y.d), tcol(tm(y.t)))}<b>${y.p}°</b> ${esc(nm(y.d))}<span class="mut">${esc(y.t)}</span><em>${y.pts} pt</em></div>`).join("")}` : '<p class="mut">Nessuna gara disputata</p>'}</section>` +
        `<section class="pn"><h3>Prossima gara</h3>${nx ? `<p><b>${esc(nx.name)}</b></p><p class="mut">${esc(nx.circuit)} · ${esc(nx.country)}</p><p class="big">${nx.date}</p>${nx.sprint ? '<span class="tg">SPRINT</span>' : ""}` : '<p class="mut">Stagione conclusa</p>'}</section></div>`;
    },
    drivers(e) {
      const st = Object.fromEntries(stand(e).d.map((d, i) => [d.id, { ...d, pos: i + 1 }]));
      const rows = Object.values(e.drivers).map((d) => { const s = st[d.id] || { pts: 0, w: 0, pod: 0, pos: 999 }, c = tcol(e.teams[d.team] || { name: d.team });
        return { s: `${d.name} ${d.number} ${d.team} ${d.nat}`, v: [s.pos, d.name, +d.number || 0, d.team, d.nat, s.w, s.pod, s.pts], c: [s.pos < 999 ? s.pos : "-", `<div class="who">${av(d.name, c)}<span><b>${esc(d.name)}</b>${d.note ? `<small>${esc(d.note)}</small>` : ""}</span></div>`, `<b class="nm">${esc(d.number)}</b>`, esc(d.team), esc(d.nat), s.w, s.pod, `<b>${s.pts}</b>`, act("drivers", d.id)] }; });
      return head("Anagrafica piloti", "drivers", "Nuovo pilota") + table("drivers", ["#", "Pilota", "N°", "Squadra", "Nazione", "Vitt.", "Podi", "Punti", ""], rows);
    },
    teams(e) {
      const st = Object.fromEntries(stand(e).t.map((t, i) => [t.name, { ...t, pos: i + 1 }]));
      const rows = Object.values(e.teams).map((t) => { const s = st[t.name] || { pts: 0, w: 0, pos: 999 }, n = Object.values(e.drivers).filter((d) => d.team === t.name).map((d) => d.name).join(", ");
        return { s: `${t.name} ${t.make} ${n}`, v: [s.pos, t.name, t.make || "", s.w, s.pts], c: [s.pos < 999 ? s.pos : "-", `<div class="who">${av(t.name, tcol(t))}<b>${esc(t.name)}</b></div>`, esc(t.make), `<small>${esc(n)}</small>`, s.w, `<b>${s.pts}</b>`, act("teams", t.name)] }; });
      return head("Squadre", "teams", "Nuova squadra") + table("teams", ["#", "Squadra", "Moto", "Piloti", "Vitt.", "Punti", ""], rows);
    },
    makes(e) {
      const m = {};
      for (const k in e.res) for (const y of e.res[k]) { const mk = e.teams[y.t]?.make || "?", o = (m[mk] ??= { n: mk, pts: 0, w: 0 }); o.pts += +y.pts || 0; if (!k.endsWith("s") && y.p === 1) o.w++; }
      const l = Object.values(m).sort((a, b) => b.pts - a.pts);
      return `<section class="pn"><h3>Classifica costruttori (marca moto)</h3>${l.map((o) => bar(esc(o.n), o.pts, l[0].pts, KC[slug(o.n)] || "#8b90a0", `<small>${o.w} vitt.</small>`)).join("") || '<p class="mut">Nessun dato</p>'}</section>`;
    },
    races(e) {
      const rows = Object.values(e.races).sort((a, b) => a.date.localeCompare(b.date)).map((r, i) => { const d = !!e.res[r.id];
        return { s: `${r.name} ${r.circuit} ${r.country} ${r.date}`, v: [i, r.name, r.date, r.circuit, r.country, d ? 1 : 0], c: [i + 1, `<b>${esc(r.name)}</b>`, r.date, esc(r.circuit), esc(r.country), `<span class="st ${d ? "ok" : ""}">${d ? "Disputata" : "In programma"}</span>${r.sprint ? ' <span class="tg">SPRINT</span>' : ""}`, act("races", r.id, `<button data-a="res" data-id="${esc(r.id)}" title="Risultati">📝</button>`)] }; });
      return head("Calendario gare", "races", "Nuova gara") + table("races", ["#", "Gran Premio", "Data", "Circuito", "Paese", "Stato", ""], rows);
    },
    results(e) {
      const races = Object.values(e.races).sort((a, b) => a.date.localeCompare(b.date));
      S.race ||= (races.filter((r) => e.res[r.id]).at(-1) || races[0])?.id || "";
      const key = S.race + (S.type === "s" ? "s" : ""), rows = e.res[key] || [], mod = key in OV.results;
      const dr = Object.values(e.drivers).sort((a, b) => a.name.localeCompare(b.name));
      return `<div class="bar2"><select id="rr">${races.map((r) => `<option value="${esc(r.id)}"${r.id === S.race ? " selected" : ""}>${esc(r.id)}. ${esc(r.name)}</option>`).join("")}</select><select id="rt"><option value="">Gara</option><option value="s"${S.type === "s" ? " selected" : ""}>Sprint</option></select>${mod ? '<span class="tg">MODIFICATO</span>' : ""}<span class="sp"></span><button data-a="auto" class="gh">⚡ Punti automatici</button><button data-a="radd" class="gh">+ Riga</button><button data-a="rrst" class="gh"${mod ? "" : " disabled"}>↺ Originali</button><button data-a="rsave" class="pr">Salva</button></div>` +
        `<div class="tw"><table id="re"><thead><tr><th>Pos</th><th>Pilota</th><th>Squadra</th><th>Punti</th><th></th></tr></thead><tbody>${rows.map((y, i) => rrow(y, dr, i)).join("")}</tbody></table></div><template id="rt0">${rrow({ d: dr[0]?.id, t: dr[0]?.team, p: rows.length + 1, pts: 0 }, dr, 0)}</template>`;
    },
    settings() {
      const n = Object.values(OV).reduce((a, o) => a + Object.keys(o).length, 0);
      return `<div class="two"><section class="pn"><h3>Backup modifiche</h3><p class="mut">Le modifiche sono salvate nel ${API ? "database SQLite del server" : "browser"} (${n} voci). Esportale per averne una copia o spostarle su un altro dispositivo.</p><div class="bt l"><button data-a="bk" class="pr">⬇ Esporta JSON</button><label class="gh fl">⬆ Importa JSON<input type="file" id="imp" accept=".json" hidden></label></div></section>` +
        `<section class="pn"><h3>Dati</h3><p class="mut">Ricarica i dati ufficiali dall'API MotoGP (le modifiche locali restano applicate sopra).</p><div class="bt l"><button data-a="rf" class="pr">↻ Ricarica dati</button><button data-a="rst" class="gh dn">🗑 Azzera modifiche</button></div></section></div>`;
    },
  };
  const rrow = (y, dr, i) => `<tr><td><input class="s" data-f="p" value="${esc(y.p)}"></td><td><select data-f="d">${dr.map((d) => `<option value="${esc(d.id)}" data-t="${esc(d.team)}"${d.id === y.d ? " selected" : ""}>${esc(d.name)}</option>`).join("")}</select></td><td><input data-f="t" value="${esc(y.t)}"></td><td><input class="s" type="number" data-f="pts" value="${y.pts}"></td><td><button data-a="rdel" title="Elimina riga">✕</button></td></tr>`;
  const act = (k, id, x = "") => `<div class="ac">${x}<button data-a="edit" data-k="${k}" data-id="${esc(id)}" title="Modifica">✎</button><button data-a="del" data-k="${k}" data-id="${esc(id)}" title="Elimina">🗑</button></div>`;
  const head = (t, k, add) => `<div class="bar2"><span class="mut">${t}</span><span class="sp"></span><button data-a="exp" data-k="${k}" class="gh">⬇ CSV</button><button data-a="add" data-k="${k}" class="pr">+ ${add}</button></div>`;

  // ---- form e azioni ----
  const FORMS = {
    drivers: (e) => [{ k: "name", l: "Nome e cognome", req: 1 }, { k: "number", l: "Numero", type: "number" }, { k: "team", l: "Squadra", type: "select", opts: [["", "—"], ...Object.keys(e.teams).map((t) => [t, t])] }, { k: "nat", l: "Nazione" }, { k: "note", l: "Note" }],
    teams: (e, c) => [{ k: "name", l: "Nome squadra", req: 1, ro: !c }, { k: "make", l: "Moto (costruttore)" }, { k: "color", l: "Colore", type: "color" }],
    races: () => [{ k: "name", l: "Gran Premio", req: 1 }, { k: "date", l: "Data", type: "date", req: 1 }, { k: "circuit", l: "Circuito" }, { k: "country", l: "Paese" }],
  };
  const KEY = { drivers: "drivers", teams: "teams", races: "races" };
  function edit(k, id) {
    const e = E(), src = e[k], isNew = !id, vals = isNew ? (k === "teams" ? { color: "#ff2d2d" } : {}) : { ...src[id] };
    form(isNew ? "Nuovo" : "Modifica", FORMS[k](e, isNew), vals, (v) => {
      const key = isNew ? (k === "teams" ? v.name : "c" + Date.now()) : id;
      if (!key) return;
      OV[k][key] = { ...(OV[k][key] || {}), ...v, id: key, del: false }; persist(); render(); toast("Salvato");
    });
  }
  const readRows = () => [...document.querySelectorAll("#re tbody tr")].map((tr) => { const g = (f) => tr.querySelector(`[data-f="${f}"]`).value, p = g("p"); return { d: g("d"), t: g("t"), p: isNaN(+p) || p === "" ? p : +p, pts: +g("pts") || 0 }; });
  const ACT = {
    add: (b) => edit(b.dataset.k), edit: (b) => edit(b.dataset.k, b.dataset.id),
    del(b) {
      if (!confirm("Eliminare questa voce?")) return;
      const k = b.dataset.k; OV[k][b.dataset.id] = { ...(OV[k][b.dataset.id] || {}), del: true }; persist(); render(); toast("Eliminato");
    },
    res(b) { S.race = b.dataset.id; S.type = ""; nav("results"); },
    exp(b) {
      const e = E(), k = b.dataset.k;
      if (k === "drivers") csv("piloti", ["Nome", "Numero", "Squadra", "Nazione", "Note"], Object.values(e.drivers).map((d) => [d.name, d.number, d.team, d.nat, d.note]));
      if (k === "teams") csv("squadre", ["Squadra", "Moto", "Colore"], Object.values(e.teams).map((t) => [t.name, t.make, t.color]));
      if (k === "races") csv("gare", ["Gran Premio", "Data", "Circuito", "Paese"], Object.values(e.races).map((r) => [r.name, r.date, r.circuit, r.country]));
    },
    radd() { const t = $("#rt0").content.cloneNode(true); $("#re tbody").appendChild(t); },
    rdel: (b) => b.closest("tr").remove(),
    auto() {
      const P = S.type === "s" ? [12, 9, 7, 6, 5, 4, 3, 2, 1] : [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
      document.querySelectorAll("#re tbody tr").forEach((tr) => { const p = +tr.querySelector('[data-f="p"]').value; tr.querySelector('[data-f="pts"]').value = P[p - 1] || 0; });
    },
    rsave() { OV.results[S.race + (S.type === "s" ? "s" : "")] = readRows(); persist(); render(); toast("Risultati salvati: classifiche aggiornate"); },
    rrst() { delete OV.results[S.race + (S.type === "s" ? "s" : "")]; persist(); render(); toast("Ripristinati i dati originali"); },
    bk: () => dl("gestionale-mgp-backup.json", "application/json", JSON.stringify(OV, null, 2)),
    async rf() { toast("Aggiornamento in corso…"); if (API) await fetch("api/refresh", { method: "POST" }).catch(() => {}); MGP.reset(); await loadBase(); render(); toast("Dati ricaricati"); },
    rst() { if (confirm("Azzerare TUTTE le modifiche locali?")) { OV = { drivers: {}, teams: {}, races: {}, results: {} }; persist(); render(); toast("Modifiche azzerate"); } },
  };
  M.addEventListener("click", (ev) => {
    const th = ev.target.closest("th[data-i]");
    if (th) { const id = th.closest("table").dataset.t, i = +th.dataset.i, o = S.sort[id]; S.sort[id] = { i, d: o?.i === i ? -o.d : 1 }; return render(); }
    const b = ev.target.closest("[data-a]"); if (b) ACT[b.dataset.a]?.(b);
  });
  M.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "rr") { S.race = t.value; render(); }
    if (t.id === "rt") { S.type = t.value; render(); }
    if (t.matches('#re [data-f="d"]')) t.closest("tr").querySelector('[data-f="t"]').value = t.selectedOptions[0].dataset.t || "";
    if (t.id === "imp" && t.files[0]) t.files[0].text().then((x) => { try { OV = { drivers: {}, teams: {}, races: {}, results: {}, ...JSON.parse(x) }; persist(); render(); toast("Importato"); } catch { toast("File non valido"); } });
  });
  // ---- navigazione ----
  const NAV = [["dash", "📊", "Dashboard"], ["drivers", "🏍️", "Piloti"], ["teams", "👥", "Squadre"], ["makes", "🛠️", "Costruttori"], ["races", "🏁", "Gare"], ["results", "📝", "Risultati"], ["settings", "⚙️", "Impostazioni"]];
  $("#mn").innerHTML = NAV.map(([k, i, l]) => `<a href="#${k}" data-v="${k}"><i>${i}</i><span>${l}</span></a>`).join("");
  function render() {
    $("#mn").querySelectorAll("a").forEach((a) => a.classList.toggle("on", a.dataset.v === S.view));
    $("#tt").textContent = NAV.find((n) => n[0] === S.view)[2];
    M.innerHTML = V[S.view](E());
  }
  function nav(v) { S.view = V[v] ? v : "dash"; if (location.hash.slice(1) !== S.view) location.hash = S.view; else render(); }
  addEventListener("hashchange", () => { S.view = V[location.hash.slice(1)] ? location.hash.slice(1) : "dash"; render(); });
  $("#q").oninput = () => { if (["drivers", "teams", "races"].includes(S.view)) { const p = $("#q").selectionStart; render(); const q = $("#q"); q.focus(); q.setSelectionRange(p, p); } };
  addEventListener("keydown", (e) => { if (e.key === "/" && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); $("#q").focus(); } });
  $("#th").onclick = () => { const r = document.documentElement, n = r.dataset.theme === "light" ? "dark" : "light"; r.dataset.theme = n; try { localStorage.setItem("mgp_theme", n); } catch {} };
  try { await loadBase(); } catch (err) { M.innerHTML = `<p class="err">${esc(err.message)}</p>`; return; }
  if (!Object.keys(BASE.races).length) M.innerHTML = '<p class="err">Nessun dato: avvia <code>node server.js</code> e ricarica.</p>';
  else { S.view = V[location.hash.slice(1)] ? location.hash.slice(1) : "dash"; render(); }
})();
