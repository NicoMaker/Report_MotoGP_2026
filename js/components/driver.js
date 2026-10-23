function driver(id) {
  const d = S.drivers.find((x) => x.driverId === id);
  if (!d) throw new Error("Pilota non trovato");
  const st = S.ds.find((x) => x.Driver.driverId === id);
  const rows = S.races
    .map((r) => {
      const x = S.res[r.round]?.Results?.find((y) => y.Driver.driverId === id);
      return (
        x && [
          `<a href="#/race/${r.round}">${r.raceName}</a>`,
          tn(x.Constructor),
          x.grid,
          pb(x.positionText),
          x.points,
          x.Time?.time || x.status,
          x.FastestLap?.Time?.time || "",
        ]
      );
    })
    .filter(Boolean);
  const all = S.races
    .map((r) => S.res[r.round]?.Results?.find((y) => y.Driver.driverId === id))
    .filter(Boolean);
  const nPod = all.filter((y) => +y.position <= 3).length;
  const best = Math.min(...all.map((y) => +y.position || 99));
  const T = tally("d", id),
    stats = [
      ...(d.dateOfBirth ? [["🎂 Età", age(d.dateOfBirth) + " anni"]] : []),
      ...(st ? [[medal(+st.position) + " Classifica", st.position + "°"]] : []),
      ["Gare", all.length],
      [medal(1) + " Vittorie", T.w],
      [medal(2) + " 2° posti", T.s],
      [medal(3) + " 3° posti", T.t],
      ["⏱ Pole", T.p],
      ["Podi", nPod],
      ["Posizione Miglore Raggiunta", all.length ? best + "°" : "-"],
      ["Punti", st?.points ?? "-"],
    ];
  const tm = st?.Constructors?.at(-1) || all.at(-1)?.Constructor;
  const mx = Math.max(
    1,
    ...S.races.map(
      (r) =>
        +(
          S.res[r.round]?.Results?.find((y) => y.Driver.driverId === id)
            ?.points || 0
        ),
    ),
  );
  // Per ogni gara: punti, barra, numero gara, posizione d'arrivo, griglia e qualifica (POLE sì/no)
  const spark = `<div class="sw"><button type="button" class="sa sal off" aria-label="Gare precedenti" title="Gare precedenti">‹</button><div class="spark" style="--tc:${col(tm?.constructorId || "x")}">${S.races
    .map((r) => {
      const y = S.res[r.round]?.Results?.find((z) => z.Driver.driverId === id),
        q = S.q[r.round]?.QualifyingResults?.find(
          (z) => z.Driver.driverId === id,
        ),
        p = +(y?.points || 0),
        pole = !!q && +q.position === 1,
        n = +y?.position,
        cls = pole ? " pole" + (n >= 1 && n <= 3 ? " pd" + n : "") : "",
        tip =
          `${r.raceName}\n` +
          (y
            ? `Arrivo: ${isNaN(+y.positionText) ? y.status || y.positionText : y.positionText + "°"}${y.grid ? " · Griglia: " + (y.grid === "0" ? "corsia box" : y.grid + "°") : ""} · ${p} pt`
            : "Gara non ancora disputata") +
          (q
            ? `\nQualifica: ${pole ? "POLE POSITION" : q.position + "°"}`
            : "");
      return `<a href="#/race/${r.round}" class="sc${y ? "" : " off"}${cls}" title="${esc(tip)}"><span class="spm">${medal(n)}</span><b class="spv">${y ? p : ""}</b><span class="spb"><i style="height:${y ? Math.max(6, (p / mx) * 100) : 3}%" class="${y ? ["", "g", "s", "b"][n] || "" : "off"}"></i></span><small>${r.round}</small>${y ? pb(y.positionText) : '<span class="pb n">·</span>'}<em class="spg">${y ? (y.grid && y.grid !== "0" ? "G" + y.grid : "BOX") : ""}</em><u class="spp${pole ? " on" : ""}">${pole ? "⏱ POLE" : q ? "Q" + q.position : y ? "-" : ""}</u></a>`;
    })
    .join(
      "",
    )}</div><button type="button" class="sa sar" aria-label="Gare successive" title="Gare successive">›</button></div><p class="mut sl">Barra = punti · <b>numero</b> = gara · badge = posizione d'arrivo (${medal(1)}${medal(2)}${medal(3)} podio, R = ritirato) · G = griglia di partenza · ⏱ POLE = pole position, Q = posizione in qualifica</p>`;
  A.innerHTML =
    `<div class="hero dh" style="--tc:${col(tm?.constructorId || "x")}"><span class="wm">${d.permanentNumber || ""}</span>${ph(d)}<div><h2 style="margin:0">${d.givenName} ${d.familyName}</h2><span class="mut">${flag(d.nationality)} ${d.nationality}${d.dateOfBirth ? " · " + bio(d) : ""}</span><br>${tm ? `<a class="tn" href="#/team/${tm.constructorId}">${ticon(tm.constructorId, tm.name, 26)}${tm.name}</a>` : ""}${st ? ` ${rk(st.position)} <b class="pill">${st.points} pt · ${st.wins} vitt.</b>` : ""}</div>${pn("d", id)}</div>` +
    `<div class="stats">${stats.map(([a, b]) => `<div><b>${b}</b><small>${a}</small></div>`).join("")}</div>` +
    `<h3 class="sec">Punti gara per gara</h3>${spark}` +
    `<h3 class="sec">Risultati gara per gara</h3>` +
    tbl(
      [
        "Gara",
        "Squadra",
        "Griglia",
        "Arrivo",
        "Punti",
        "Tempo / stato",
        "Giro veloce",
      ],
      rows,
    );
  // Frecce ‹ › per muoversi tra le gare nella striscia dei punti e nella tabella dei risultati
  const tw = A.querySelector(".tw");
  if (tw) {
    const w = document.createElement("div");
    w.className = "sw tb";
    tw.replaceWith(w);
    w.innerHTML =
      '<button type="button" class="sa sal off" aria-label="Indietro" title="Indietro">‹</button>' +
      '<button type="button" class="sa sar off" aria-label="Avanti" title="Avanti">›</button>';
    w.insertBefore(tw, w.lastChild);
  }
  A.querySelectorAll(".sw").forEach((w) => {
    const sc = w.querySelector(".spark, .tw");
    if (sc)
      sc.addEventListener("scroll", () => arrowSync(w), { passive: true });
    arrowSync(w);
  });
  // La striscia parte centrata sull'ultima gara disputata
  const sp = A.querySelector(".spark"),
    cur = sp && [...sp.querySelectorAll("a.sc:not(.off)")].pop();
  if (cur) {
    sp.scrollLeft = cur.offsetLeft - (sp.clientWidth - cur.offsetWidth) / 2;
    arrowSync(sp.parentNode);
  }
}
// Mostra/nasconde le frecce a inizio e fine scorrimento (nascoste se non c'è nulla da scorrere)
function arrowSync(w) {
  const sc = w.querySelector(".spark, .tw"),
    l = w.querySelector(".sal"),
    r = w.querySelector(".sar");
  if (!sc || !l || !r) return;
  const can = sc.scrollWidth > sc.clientWidth + 4;
  l.classList.toggle("off", !can || sc.scrollLeft < 4);
  r.classList.toggle(
    "off",
    !can || sc.scrollLeft + sc.clientWidth > sc.scrollWidth - 4,
  );
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".sa");
  if (!b) return;
  const w = b.parentNode,
    sc = w.querySelector(".spark, .tw");
  sc.scrollBy({
    left: (b.classList.contains("sal") ? -1 : 1) * sc.clientWidth * 0.75,
    behavior: "smooth",
  });
});
addEventListener("resize", () =>
  document.querySelectorAll(".sw").forEach(arrowSync),
);
