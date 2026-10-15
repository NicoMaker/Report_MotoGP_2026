const TABS = [
  ["res", "Risultati"],
  ["q", "Qualifica"],
  ["sp", "Sprint"],
  ["st", "Classifica dopo gara"],
];
async function race(n, tab = "res") {
  n = n || lastDone() || 1;
  const r = S.races.find((x) => x.round == n);
  if (!r) throw new Error("Gara non trovata");
  const L = r.Circuit.Location,
    w = S.res[n]?.Results?.[0],
    pq = S.q[n]?.QualifyingResults?.[0],
    tot = S.races.length;
  let h =
    `<div class="hero rh"><span class="fg big">${flag(L.country)}</span><div><small class="mut">Gara ${r.round} di ${tot}</small><h2 style="margin:2px 0">${r.raceName}</h2><span class="mut">${r.Circuit.circuitName} · ${L.locality}, ${L.country} · ${fd(r)}</span>${w ? `<br><b>🏆 ${flag(w.Driver.nationality)} ${w.Driver.givenName} ${w.Driver.familyName}</b> ${ticon(w.Constructor.constructorId, w.Constructor.name, 22)}` : ""}${pq ? `<br><span class="mut">⏱ Pole: ${flag(pq.Driver.nationality)} ${pq.Driver.givenName} ${pq.Driver.familyName}</span> ${ticon(pq.Constructor.constructorId, pq.Constructor.name, 22)}` : ""}</div><div class="nv">${+n > 1 ? `<a rel="prev" href="#/race/${+n - 1}/${tab}">‹</a>` : ""}${+n < tot ? `<a rel="next" href="#/race/${+n + 1}/${tab}">›</a>` : ""}</div></div>` +
    sel(
      "rs",
      S.races.map((x) => [
        x.round,
        `${x.round}. ${x.raceName}`,
        `${x.Circuit.circuitName} ${x.Circuit.Location.locality} ${x.Circuit.Location.country} ${x.date}`,
        `<span class="fg">${flag(x.Circuit.Location.country)}</span>`,
      ]),
      n,
    ) +
    `<div class="tabs">${TABS.map(([k, l]) => `<a href="#/race/${n}/${k}" class="${k === tab ? "on" : ""}">${l}</a>`).join("")}</div>`;
  const none =
    '<p class="mut">Dati non ancora disponibili per questa sessione.</p>';
  if (tab === "res") {
    const x = S.res[n]?.Results;
    h += x
      ? podR(x, (y) => y.Time?.time || y.status) +
        tbl(
          [
            "#",
            "Pilota",
            "Squadra",
            "Griglia",
            "Giri",
            "Tempo / stato",
            "Giro veloce",
            "Pt",
          ],
          x.map((y) => [
            pb(y.positionText),
            dn(y.Driver),
            tn(y.Constructor),
            y.grid,
            y.laps,
            y.Time?.time || y.status,
            y.FastestLap
              ? `<span class="${y.FastestLap.rank == 1 ? "fl" : ""}">${y.FastestLap.Time.time} (g.${y.FastestLap.lap})</span>`
              : "",
            y.points,
          ]),
          pod(x.map((y) => [+y.position])),
        )
      : none;
  }
  if (tab === "q") {
    const x = S.q[n]?.QualifyingResults;
    h += x
      ? podR(x, (y) => y.Q2 || y.Q1) +
        tbl(
          ["#", "Pilota", "Squadra", "Q1", "Q2"],
          x.map((y) => [
            pb(y.position),
            dn(y.Driver),
            tn(y.Constructor),
            y.Q1,
            y.Q2,
          ]),
          pod(x.map((y) => [+y.position])),
        )
      : none;
  }
  if (tab === "sp") {
    const x = S.sp[n]?.SprintResults;
    h += x
      ? podR(x, (y) => y.Time?.time || y.status) +
        tbl(
          ["#", "Pilota", "Squadra", "Griglia", "Tempo / stato", "Pt"],
          x.map((y) => [
            pb(y.positionText),
            dn(y.Driver),
            tn(y.Constructor),
            y.grid,
            y.Time?.time || y.status,
            y.points,
          ]),
          pod(x.map((y) => [+y.position])),
        )
      : '<p class="mut">Nessuna sprint in questo weekend.</p>';
  }
  if (tab === "st") {
    const [a, b] = await Promise.all(
      ["dstand_", "cstand_"].map((k) => MGP.load(k + n).catch(() => null)),
    );
    h += a
      ? `<div class="two"><div><h3>Piloti</h3>${tbl(
          ["#", "Pilota", "Pt"],
          ds(a).map((s) => [
            pb(s.positionText),
            dn(s.Driver),
            `<b>${s.points}</b>`,
          ]),
        )}</div><div><h3>Squadre</h3>${tbl(
          ["#", "Squadra", "Pt"],
          cs(b).map((s) => [
            pb(s.positionText),
            tn(s.Constructor),
            `<b>${s.points}</b>`,
          ]),
        )}</div></div>`
      : none;
  }
  A.innerHTML = h;
  $("#rs").onchange = (e) =>
    (location.hash = `#/race/${e.target.value}/${tab}`);
}
