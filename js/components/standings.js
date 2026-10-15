function drivers() {
  const m = +S.ds[0]?.points || 1;
  A.innerHTML =
    `<h2>Classifica piloti</h2>` +
    champBox("d") +
    podD(S.ds) +
    tbl(
      [
        "#",
        "Pilota",
        "Squadra",
        medal(1) + " Vitt.",
        medal(2) + " 2°",
        medal(3) + " 3°",
        "⏱ Pole",
        "Punti",
      ],
      S.ds.map((s) => [
        pb(s.positionText),
        dn(s.Driver),
        tn(s.Constructors?.at(-1)),
        ...T3(tally("d", s.Driver.driverId)),
        `<b>${s.points}</b><div class="bar" style="width:${(s.points / m) * 100}%;background:${col(s.Constructors?.at(-1)?.constructorId || "x")}"></div>`,
      ]),
      pod(S.ds.map((s) => [+s.position])),
    ) +
    `<h2 style="margin-top:20px">Tutti i piloti</h2>${fbox("Cerca pilota, numero, nazionalità…")}<div class="grid">${S.drivers
      .map((d) => {
        const sd = S.ds.find((x) => x.Driver.driverId === d.driverId),
          t = sd?.Constructors?.at(-1);
        return `<a class="card dcd p${+sd?.position <= 3 ? +sd.position : 0}" style="--tc:${col(t?.constructorId || "x")}" href="#/driver/${d.driverId}"><span class="wm">${d.permanentNumber || ""}</span>${rk(sd?.position)}<div class="dn">${ph(d)}<span><b>${d.givenName} ${d.familyName}</b><br><small>${flag(d.nationality)} ${d.nationality}${t ? " · " + t.name : ""}${d.dateOfBirth ? `<br>🎂 ${itDate(d.dateOfBirth)} · ${age(d.dateOfBirth)} anni` : ""}</small></span></div>${tlh(tally("d", d.driverId))}</a>`;
      })
      .join("")}</div>`;
}
function teams() {
  const m = +S.cs[0]?.points || 1;
  const drv = (id) =>
    S.ds.filter((d) => d.Constructors?.some((x) => x.constructorId === id));
  A.innerHTML =
    `<h2>Squadre 2026</h2><div class="wallw"><button type="button" class="wb wl" aria-label="Indietro">‹</button><div class="wall">${S.cs.map((c) => `<a href="#/team/${c.Constructor.constructorId}">${ticon(c.Constructor.constructorId, c.Constructor.name, 56)}<small>${c.Constructor.name}</small></a>`).join("")}</div><button type="button" class="wb wr" aria-label="Avanti">›</button></div>` +
    champBox("c") +
    podT(S.cs) +
    `${fbox("Cerca squadra o pilota…")}<div class="grid tg">${S.cs
      .map((c) => {
        const id = c.Constructor.constructorId,
          k = col(id);
        return `<div class="tc p${+c.position <= 3 ? +c.position : 0}" style="--tc:${k}">${tmb(c.position)}<a class="tch" href="#/team/${id}">${ticon(id, c.Constructor.name, 52)}<span class="tt"><b>${c.Constructor.name}</b><small>${c.Constructor.nationality || ""}</small></span>${rk(c.positionText, true)}</a><div class="tcs"><span><b>${c.points}</b> pt</span></div>${tlh(tally("c", id))}<div class="bar" style="width:${(c.points / m) * 100}%;background:${k}"></div>${drv(
          id,
        )
          .map(
            (d) =>
              `<div class="tcd"><span class="tcl">${rk(d.positionText)}${dn(d.Driver)}</span><em>${d.points} pt</em></div>`,
          )
          .join("")}</div>`;
      })
      .join("")}</div>` +
    `<h2 style="margin-top:22px">Classifica costruttori</h2>` +
    tbl(
      [
        "#",
        "Squadra",
        medal(1) + " Vitt.",
        medal(2) + " 2°",
        medal(3) + " 3°",
        "⏱ Pole",
        "Punti",
      ],
      S.cs.map((s) => [
        pb(s.positionText),
        tn(s.Constructor),
        ...T3(tally("c", s.Constructor.constructorId)),
        `<b>${s.points}</b><div class="bar" style="width:${(s.points / m) * 100}%;background:${col(s.Constructor.constructorId)}"></div>`,
      ]),
      pod(S.cs.map((s) => [+s.position])),
    );
  setTimeout(() => document.querySelectorAll(".wall").forEach(wallSync), 0);
}
function team(id) {
  const c = S.cs.find((x) => x.Constructor.constructorId === id);
  if (!c) throw new Error("Squadra non trovata");
  const C = c.Constructor,
    k = col(id);
  const ds = S.ds.filter((d) =>
    d.Constructors?.some((x) => x.constructorId === id),
  );
  const rows = S.races
    .map((r) => {
      const rs = (S.res[r.round]?.Results || [])
        .filter((y) => y.Constructor.constructorId === id)
        .sort((a, b) => +a.position - +b.position);
      if (!rs.length) return "";
      const best = +rs[0].position,
        m = best === 1 ? "g" : best === 2 ? "s" : best === 3 ? "b" : "",
        pods = rs.filter((y) => +y.position <= 3).length;
      const tag =
        rs.length > 1 && +rs[0].position === 1 && +rs[1].position === 2
          ? "🏆 DOPPIETTA"
          : pods > 1
            ? "2 SUL PODIO"
            : best === 1
              ? "VITTORIA"
              : pods === 1
                ? "1 SUL PODIO"
                : "";
      return `<div class="trw ${m}"><div class="trh"><span class="fg">${flag(r.Circuit.Location.country)}</span><div><a href="#/race/${r.round}"><b>${r.raceName}</b></a><small>Gara ${r.round} · ${fd(r)}</small>${tag ? `<u class="tag${tag === "1 SUL PODIO" ? " t" + best : ""}">${tag}</u>` : ""}</div></div><div class="trd">${rs.map((y) => `<a class="tdv p${y.position <= 3 ? y.position : ""}" href="#/driver/${y.Driver.driverId}">${ph(y.Driver)}<span><b>${y.Driver.familyName}</b><small>griglia ${y.grid} · ${y.points} pt</small></span>${pb(y.positionText)}</a>`).join("")}</div><div class="trp"><b>${rs.reduce((a, y) => a + +y.points, 0)}</b><small>pt</small></div></div>`;
    })
    .filter(Boolean);
  const T = tally("c", id),
    stats = [
      [medal(+c.position) + " Classifica", c.position + "°"],
      ["Punti", c.points],
      [medal(1) + " Vittorie", T.w],
      [medal(2) + " 2° posti", T.s],
      [medal(3) + " 3° posti", T.t],
      ["⏱ Pole", T.p],
      ["Podi", T.w + T.s + T.t],
    ];
  A.innerHTML =
    `<div class="hero th" style="--tc:${k}">${ticon(id, C.name, 104)}<div><h2 style="margin:0">${C.name}</h2><span class="mut">${flag(C.nationality)} ${C.nationality || ""} · ${ds.length} piloti</span> ${rk(c.position)}</div><span class="wm tw2">${ticon(id, C.name, 150)}</span>${pn("c", id)}</div>` +
    `<div class="stats">${stats.map(([a, b]) => `<div><b>${b}</b><small>${a}</small></div>`).join("")}</div>` +
    `<div class="chips">${ds.map((d) => `<a class="chip" href="#/driver/${d.Driver.driverId}" style="text-decoration:none">${rk(d.positionText)}${ph(d.Driver)}<b>${d.Driver.givenName[0]}. ${d.Driver.familyName}</b><em>${d.points} pt</em></a>`).join("")}</div>` +
    `<h3 class="sec" style="display:flex;align-items:center;gap:8px">${ticon(id, C.name, 22)} Risultati gara per gara</h3>${fbox("Cerca gara, pilota, vittoria, doppietta…")}<div class="grid trl">${rows.join("")}</div>`;
}
