const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
// Medaglie 1°/2°/3° disegnate in SVG (le emoji 🥇🥈🥉 cambiano da sistema a sistema e su Windows l'oro sembra bronzo)
const MC = [
  null,
  ["#b8860b", "#ffd23f", "#5a3d00"],
  ["#6f7782", "#e3e6ea", "#2b2f36"],
  ["#6e3510", "#cd7f32", "#2b1400"],
];
const medal = (n) => {
  const c = MC[n];
  return c
    ? `<svg class="mdl" viewBox="0 0 24 30" aria-hidden="true"><path d="M5 0h6l4 12H9z" fill="#e10600"/><path d="M19 0h-6l-4 12h6z" fill="#a80500"/><circle cx="12" cy="19" r="10" fill="${c[0]}"/><circle cx="12" cy="19" r="7.6" fill="${c[1]}"/><text x="12" y="19" dy=".35em" text-anchor="middle" font-size="13" font-weight="800" fill="${c[2]}" style="font-family:'Barlow Condensed',Impact,sans-serif;font-style:italic">${n}</text></svg>`
    : "";
};
// Emblemi squadra: cerchio + colore + sigla. Sopra va il logo ufficiale fornito dall'API MotoGP (LG);
// se esiste img/teams/<id>.svg viene usato quello al suo posto.
const LG = {};
const ticon = (id, name = "", s) => {
  const k = col(id),
    t = (name || id).trim().split(/\s+/)[0].slice(0, 3).toUpperCase(),
    fs = [0, 56, 42, 34][t.length] || 34;
  const lg = LG[id]
    ? `<img class="lg" src="${esc(LG[id])}" alt="${esc(name)}" loading="lazy" referrerpolicy="no-referrer" onload="this.parentNode.classList.add('lgok')" onerror="this.remove()">`
    : "";
  return `<span class="ti" style="${s ? "--s:" + s + "px" : ""}" title="${esc(name)}"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#15171c"/><circle cx="50" cy="50" r="41" fill="${k}"/><text x="50" y="50" dy=".35em" text-anchor="middle" font-size="${fs}" fill="#fff" stroke="#15171c" stroke-width="5" paint-order="stroke" stroke-linejoin="round" style="font-family:'Barlow Condensed',Impact,sans-serif;font-weight:800;font-style:italic">${t}</text></svg>${lg}<img class="loc" src="img/teams/${id}.svg" alt="" onload="this.parentNode.classList.add('im')" onerror="this.remove()"></span>`;
};
// Titolo mondiale: "final" = stagione finita, "clinched" = matematico con gare ancora da correre, "open" = ancora aperto.
// Punti massimi ancora in palio: pilota 25 a gara + 12 a sprint; squadra 25+20 a gara + 12+9 a sprint.
const titles = () => {
  const rem = S.races.filter((r) => !S.res[r.round]),
    sp = rem.filter((r) => r.Sprint || S.sp[r.round]).length;
  const mk = (list, perRace, perSprint) => {
    const [a, b] = list,
      max = rem.length * perRace + sp * perSprint;
    if (!a) return { state: "open" };
    const gap = b ? +a.points - +b.points : +a.points;
    return {
      state: rem.length === 0 ? "final" : gap > max ? "clinched" : "open",
      a,
      b,
      gap,
      max,
      left: rem.length,
    };
  };
  return { d: mk(S.ds, 25, 12), c: mk(S.cs, 45, 21) };
};
// Banner "ha vinto il mondiale" (kind: "d" piloti, "c" costruttori); vuoto se il titolo è ancora aperto
const champBox = (kind) => {
  const t = titles()[kind];
  if (t.state === "open") return "";
  const d = kind === "d",
    w = d ? t.a.Driver : t.a.Constructor,
    nm = d ? `${w.givenName} ${w.familyName}` : w.name;
  const who = d
      ? t.b
        ? t.b.Driver.familyName
        : ""
      : t.b?.Constructor.name || "",
    c = d ? t.a.Constructors?.at(-1)?.constructorId : w.constructorId;
  const title = d ? "Mondiale Piloti" : "Mondiale Squadre";
  const msg =
    t.state === "final"
      ? `${nm} ha vinto il ${title} 2026!`
      : `${nm} ha vinto matematicamente il ${title} 2026!`;
  const team = d ? t.a.Constructors?.at(-1)?.name : "",
    sub =
      (team ? team + " · " : "") +
      (t.state === "final"
        ? `Stagione conclusa · ${t.a.points} pt${t.b ? ` · +${t.gap} su ${who}` : ""}`
        : `Con ancora ${t.left} gar${t.left === 1 ? "a" : "e"} da disputare · ${t.a.points} pt, +${t.gap} su ${who} (restano al massimo ${t.max} pt)`);
  return `<a class="champ" href="#/${d ? "driver/" + w.driverId : "team/" + w.constructorId}" style="--tc:${col(c || "x")}"><span class="cup">🏆</span>${d ? ph(w) : ticon(w.constructorId, w.name, 56)}<div><small>${t.state === "final" ? "CAMPIONE DEL MONDO" : "TITOLO MATEMATICO"}</small><b>${msg}</b><span>${sub}</span></div></a>`;
};
// Frecce ‹ › per passare al pilota/squadra precedente o successivo (ordine di classifica)
const pn = (kind, id) => {
  const ids =
    kind === "d"
      ? [
          ...S.ds.map((s) => s.Driver.driverId),
          ...S.drivers
            .map((d) => d.driverId)
            .filter((x) => !S.ds.some((s) => s.Driver.driverId === x)),
        ]
      : S.cs.map((c) => c.Constructor.constructorId);
  const i = ids.indexOf(id),
    nm = (x) =>
      kind === "d"
        ? ((d) => (d ? d.givenName + " " + d.familyName : ""))(
            S.drivers.find((d) => d.driverId === x),
          )
        : S.cs.find((c) => c.Constructor.constructorId === x)?.Constructor
            .name || "",
    h = kind === "d" ? "driver" : "team";
  if (i < 0) return "";
  const a = (j, r, ch) =>
    ids[j]
      ? `<a rel="${r}" href="#/${h}/${ids[j]}" title="${esc(nm(ids[j]))}">${ch}</a>`
      : `<a class="off" aria-disabled="true">${ch}</a>`;
  return `<div class="nv pn">${a(i - 1, "prev", "‹")}${a(i + 1, "next", "›")}</div>`;
};
// Conteggio 1°/2°/3° posti in gara e pole (qualifica) per pilota ("d") o squadra ("c")
const tally = (by, id) => {
  const o = { w: 0, s: 0, t: 0, p: 0 },
    k = (y) => (by === "d" ? y.Driver.driverId : y.Constructor.constructorId);
  for (const r of S.races) {
    for (const y of S.res[r.round]?.Results || [])
      if (k(y) === id) {
        const p = +y.position;
        if (p === 1) o.w++;
        else if (p === 2) o.s++;
        else if (p === 3) o.t++;
      }
    const q = S.q[r.round]?.QualifyingResults?.find((y) => +y.position === 1);
    if (q && k(q) === id) o.p++;
  }
  o.pod = o.w + o.s + o.t;
  return o;
};
const T3 = (o) => [o.w, o.s, o.t, o.p];
const tlh = (o) =>
  `<span class="tl"><b title="Vittorie">${medal(1)} ${o.w}</b><b title="Secondi posti">${medal(2)} ${o.s}</b><b title="Terzi posti">${medal(3)} ${o.t}</b><b title="Pole position">⏱ Pole ${o.p}</b></span>`;
// Foto pilota con logo della squadra (basso a destra) e bandiera della nazionalità (basso a sinistra)
const ph = (d) => {
  const c = S.dc?.[d.driverId],
    nat =
      d.nationality ||
      S.drivers?.find((x) => x.driverId === d.driverId)?.nationality;
  return `<span class="av">${S.photos[d.driverId] ? `<img class="ph" src="${S.photos[d.driverId]}" alt="" loading="lazy" onerror="this.outerHTML='<i class=&quot;ph&quot;>${esc(d.code || d.familyName.slice(0, 3).toUpperCase())}</i>'">` : `<i class="ph">${d.code || d.familyName.slice(0, 3).toUpperCase()}</i>`}${c ? ticon(c, c.replace(/_/g, " ")) : ""}${nat && ISO[nat] ? flag(nat, "fl") : ""}</span>`;
};
// Posizione in classifica: 1°/2°/3° con medaglia ed evidenziati
// nm = true: senza medaglia (quando la medaglia è già mostrata altrove nella card)
const rk = (n, nm) =>
  n
    ? `<i class="rk r${+n <= 3 ? +n : 0}" title="${+n}° in classifica">${!nm && medal(+n) ? medal(+n) + " " : ""}${n}°</i>`
    : "";
// Fascia in alto nelle card squadra: medaglia + posizione (solo 1°/2°/3°)
const tmb = (n) =>
  +n >= 1 && +n <= 3
    ? `<div class="tmb">${medal(+n)}<b>${+n}° posto</b></div>`
    : "";
// Badge posizione: oro/argento/bronzo, punti, fuori dai punti, ritiro (R, D, W…)
const pb = (t) => {
  const n = +t,
    x = isNaN(n);
  return `<span class="pb ${x ? "x" : n === 1 ? "g" : n === 2 ? "s" : n === 3 ? "b" : n <= 10 ? "p" : "n"}">${x ? t : n}</span>`;
};
const dn = (d) =>
  `<a class="dn" href="#/driver/${d.driverId}">${ph(d)}<span>${d.givenName[0]}. <b>${d.familyName}</b></span></a>`;
const tn = (c) =>
  c
    ? `<a class="tn" href="#/team/${c.constructorId}">${ticon(c.constructorId, c.name, 26)}${c.name}</a>`
    : "";
const fbox = (p = "Filtra…") =>
  `<input class="tf" type="search" placeholder="🔎 ${p}" aria-label="${p}">`;
// Tabella con filtro testuale automatico (>6 righe) e colonne ordinabili (click sull'intestazione)
const tbl = (h, rows, cls = [], f = rows.length > 6) =>
  `${f ? fbox() : ""}<div class="tw"><table><thead><tr>${h.map((x) => `<th title="Ordina">${x}</th>`).join("")}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${cls[i] || ""}">${r.map((c) => `<td>${c ?? ""}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
// Select con ricerca: <select> reale nascosto (per .onchange / .value) + menu filtrabile. opts = [valore, etichetta, testo extra, icona HTML]
const sel = (id, opts, v) => {
  const cur = opts.find((o) => o[0] == v) || opts[0],
    item = (o) => `${o[3] || ""}<span>${esc(o[1])}</span>`;
  return (
    `<div class="ss"><select id="${id}" hidden>${opts.map((o) => `<option value="${esc(o[0])}"${o[0] == v ? " selected" : ""}>${esc(o[1])}</option>`).join("")}</select>` +
    `<button type="button" class="ssb" aria-haspopup="listbox">${item(cur)}<em>▾</em></button>` +
    `<div class="ssp" hidden><input class="ssi" type="search" placeholder="🔎 Cerca…" autocomplete="off" aria-label="Cerca"><ul class="ssl" role="listbox">${opts.map((o) => `<li role="option" data-v="${esc(o[0])}" data-x="${esc(norm(o[1] + " " + (o[2] || "")))}"${o[0] == v ? ' class="on"' : ""}>${item(o)}</li>`).join("")}</ul><p class="ssn mut" hidden>Nessun risultato</p></div></div>`
  );
};

// Podio: 2° a sinistra, 1° AL CENTRO (più alto), 3° a destra. l = [{pos,href,c,img,name,sub,val}] in ordine 1,2,3
const podium = (l) =>
  `<div class="podium">${[1, 0, 2]
    .map((i) => l[i])
    .filter(Boolean)
    .map(
      (x) =>
        `<a class="pc s${x.pos}" href="${x.href}" style="--tc:${x.c}"><u class="md" title="${x.pos}° posto">${medal(x.pos)}</u>${x.img}<small>${x.pos}°</small><b>${x.name}</b><span class="ps">${x.sub}</span><em>${x.val}</em>${x.tl || ""}</a>`,
    )
    .join("")}</div>`;
const podD = (ds) =>
  podium(
    ds.slice(0, 3).map((s, i) => {
      const c = s.Constructors?.at(-1);
      return {
        pos: i + 1,
        href: `#/driver/${s.Driver.driverId}`,
        c: col(c?.constructorId || "x"),
        img: ph(s.Driver),
        name: s.Driver.familyName,
        sub: c?.name || "",
        val: s.points + " pt",
        tl: tlh(tally("d", s.Driver.driverId)),
      };
    }),
  );
const podT = (cs) =>
  podium(
    cs.slice(0, 3).map((s, i) => {
      const k = col(s.Constructor.constructorId);
      return {
        pos: i + 1,
        href: `#/team/${s.Constructor.constructorId}`,
        c: k,
        img: ticon(s.Constructor.constructorId, s.Constructor.name),
        name: s.Constructor.name,
        sub: s.Constructor.nationality || "",
        val: s.points + " pt",
        tl: tlh(tally("c", s.Constructor.constructorId)),
      };
    }),
  );
const podR = (x, f) =>
  podium(
    x.slice(0, 3).map((y, i) => ({
      pos: i + 1,
      href: `#/driver/${y.Driver.driverId}`,
      c: col(y.Constructor.constructorId),
      img: ph(y.Driver),
      name: y.Driver.familyName,
      sub: y.Constructor.name,
      val: f(y) || "",
    })),
  );
const nextRace = () => {
  const r = S.races.find((x) => !S.res[x.round]);
  if (!r) return "";
  const d = Math.ceil(
    (new Date(r.date + "T" + (r.time || "12:00:00Z")) - Date.now()) / 864e5,
  );
  return `<a class="next" href="#/race/${r.round}"><span class="fg">${flag(r.Circuit.Location.country)}</span><div><small>Prossima gara · ${fd(r)}</small><h3>${r.raceName}</h3><p>${r.Circuit.circuitName}</p></div>${d > 0 ? `<div class="cd"><b>${d}</b><small>giorni</small></div>` : ""}</a>`;
};
