// Condiviso da browser e Node (server.js). Fonte dati: API ufficiale MotoGP (motogp.com) + Wikipedia per le foto.
// Tutto viene convertito nello stesso formato "Ergast" usato dalla versione F1, così l'interfaccia resta identica.
(function () {
  const BASE = "https://api.motogp.pulselive.com/motogp/v1/results";
  const YEAR = 2026;
  const CORE = [
    "races",
    "drivers",
    "photos",
    "results",
    "qualifying",
    "sprint",
    "driverStandings",
    "constructorStandings",
  ];
  const FILE = (k) => {
    const m = k.match(/^([a-z]+)_\d+$/i),
      g = { dstand: "standings/drivers", cstand: "standings/constructors" };
    if (m) return g[m[1]] + "/" + k;
    return (
      {
        races: "races",
        drivers: "drivers",
        photos: "drivers",
        results: "results",
        qualifying: "results",
        sprint: "results",
        driverStandings: "standings",
        constructorStandings: "standings",
      }[k] +
      "/" +
      k
    );
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function req(p) {
    for (let i = 1; i <= 6; i++) {
      const r = await fetch(BASE + p);
      if (r.ok) return r.json();
      if (r.status !== 429) throw new Error("HTTP " + r.status + " " + p);
      await sleep(2500 * i);
    }
    throw new Error("Rate limit " + p);
  }
  const slug = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  const fix = (t) => String(t || "").replace(/'/g, ":");
  const sec = (t) => {
    const p = fix(t).split(":");
    return p.length > 1 ? +p[0] * 60 + +p[1] : +p[0] || 1e9;
  };
  const pool = async (items, n, fn) => {
    const o = [];
    let i = 0;
    await Promise.all(
      Array.from({ length: n }, async () => {
        while (i < items.length) {
          const j = i++;
          o[j] = await fn(items[j], j);
        }
      }),
    );
    return o;
  };
  const CL = new Map();
  async function cls(id, old) {
    if (CL.has(id)) return CL.get(id);
    let j;
    try {
      j = await req(`/session/${id}/classification?test=false`);
    } catch {
      j = await req(`/sessions/${id}/classification`);
    }
    const c = j.classification || j || [];
    if (old) CL.set(id, c);
    return c;
  }
  // riga API -> {Driver, Constructor(squadra)}
  function who(row) {
    const r = row.rider || {},
      t = row.team || {},
      c = Object.hasOwn(row, "constructor") ? row.constructor : {};
    const full = r.full_name || `${r.name || ""} ${r.surname || ""}`.trim();
    const [g, ...f] = full.split(" ");
    const fam = (r.name && r.surname ? r.surname : f.join(" ")) || g;
    const given = r.name && r.surname ? r.name : f.length ? g : "";
    return {
      Driver: {
        driverId: slug(full),
        permanentNumber: String(r.number ?? ""),
        code: slug(fam).replace(/_/g, "").slice(0, 3).toUpperCase(),
        url: "https://en.wikipedia.org/wiki/" + full.replace(/ /g, "_"),
        givenName: given,
        familyName: fam,
        nationality: r.country?.name || "",
        iso: (r.country?.iso || "").toLowerCase(),
      },
      Constructor: {
        constructorId: slug(t.name),
        name: t.name || "",
        nationality: "",
        color: t.color || "",
        logo: t.picture || "",
        make: c.name || "",
      },
    };
  }
  const order = (rows) =>
    [...rows].sort(
      (a, b) =>
        (a.position ?? 1e3) - (b.position ?? 1e3) ||
        (b.total_laps || 0) - (a.total_laps || 0),
    );
  async function build() {
    const se = (await req("/seasons")).find((s) => +s.year === YEAR);
    if (!se) throw new Error("Stagione " + YEAR + " non trovata");
    const cat = (await req(`/categories?seasonUuid=${se.id}`)).find((c) =>
      /^motogp/i.test(c.name),
    );
    const evs = (await req(`/events?seasonUuid=${se.id}`))
      .filter((e) => !e.test)
      .sort((a, b) => new Date(a.date_start) - new Date(b.date_start));
    const races = [],
      res = [],
      qua = [],
      spr = [],
      drv = {},
      snap = {};
    await pool(evs, 4, async (e, i) => {
      const sess = await req(
        `/sessions?eventUuid=${e.id}&categoryUuid=${cat.id}`,
      );
      const q = (n) =>
        sess.find(
          (s) => (s.type === "Q" && +s.number === n) || s.type === "Q" + n,
        );
      const RAC = sess.find((s) => s.type === "RAC"),
        SPR = sess.find((s) => s.type === "SPR");
      const d = new Date(RAC?.date || e.date_end),
        round = String(i + 1);
      const old = Date.now() - new Date(e.date_end) > 864e5;
      const race = {
        season: String(YEAR),
        round,
        raceName: e.sponsored_name || e.name,
        Circuit: {
          circuitId: slug(e.circuit?.name),
          circuitName: e.circuit?.name || "",
          Location: {
            locality: e.circuit?.place || "",
            country: e.country?.name || e.circuit?.nation || "",
            iso: (e.country?.iso || "").toLowerCase(),
          },
        },
        date: d.toISOString().slice(0, 10),
        time: RAC?.date ? d.toISOString().slice(11, 19) + "Z" : "12:00:00Z",
      };
      if (SPR) race.Sprint = { date: race.date };
      races[i] = race;
      if (new Date(e.date_end) > Date.now() - 36e5) return;
      const [r, s, q1, q2] = await Promise.all(
        [RAC, SPR, q(1), q(2)].map((x) =>
          x ? cls(x.id, old).catch(() => []) : [],
        ),
      );
      [r, s, q1, q2].flat().forEach((x) => {
        const w = who(x);
        if (w.Driver.driverId) drv[w.Driver.driverId] = w.Driver;
      });
      // qualifica: prima Q2 (i 12 migliori), poi gli esclusi dalla Q1 -> ordine di griglia
      const t1 = {},
        t2 = {},
        pos = {},
        Q = [];
      q1.forEach((x) => (t1[who(x).Driver.driverId] = fix(x.best_lap?.time)));
      q2.forEach((x) => (t2[who(x).Driver.driverId] = fix(x.best_lap?.time)));
      [
        ...order(q2),
        ...order(q1).filter((x) => !(who(x).Driver.driverId in t2)),
      ].forEach((x, n) => {
        const w = who(x);
        pos[w.Driver.driverId] = n + 1;
        Q.push({
          number: w.Driver.permanentNumber,
          position: String(n + 1),
          ...w,
          Q1: t1[w.Driver.driverId] || "",
          Q2: t2[w.Driver.driverId] || "",
          Q3: "",
        });
      });
      if (Q.length) qua[i] = { ...race, QualifyingResults: Q };
      const mk = (rows, gp) => {
        const rk = rows
          .filter((x) => x.best_lap?.time)
          .sort((a, b) => sec(a.best_lap.time) - sec(b.best_lap.time))
          .map((x) => who(x).Driver.driverId);
        return order(rows).map((x, n) => {
          const w = who(x),
            p = x.position,
            ok = p != null;
          const st = String(x.status || ""),
            pt = ok
              ? String(p)
              : /DSQ/i.test(st)
                ? "D"
                : /DNS|ABS|NOT/i.test(st)
                  ? "W"
                  : "R";
          const o = {
            number: w.Driver.permanentNumber,
            position: String(ok ? p : n + 1),
            positionText: pt,
            points: String(x.points ?? 0),
            ...w,
            grid: String(pos[w.Driver.driverId] ?? 0),
            laps: String(x.total_laps ?? ""),
            status: ok
              ? "Finished"
              : st && !/OUTSTND/i.test(st)
                ? st
                : "Ritirato",
          };
          const t = ok
            ? +p === 1
              ? fix(x.time)
              : x.gap?.first
                ? String(x.gap.first).replace(/^(?!\+)/, "+")
                : ""
            : "";
          if (t) o.Time = { time: t };
          if (x.best_lap?.time)
            o.FastestLap = {
              rank: String(rk.indexOf(w.Driver.driverId) + 1),
              lap: String(x.best_lap.number ?? ""),
              Time: { time: fix(x.best_lap.time) },
            };
          return o;
        });
      };
      if (r.length) res[i] = { ...race, Results: mk(r) };
      if (s.length) spr[i] = { ...race, SprintResults: mk(s) };
    });
    // classifiche cumulative dopo ogni gara (punti gara + sprint)
    const D = {},
      T = {},
      ds = {},
      cs = {},
      last = {};
    const bump = (m, id, o, pts, p) => {
      const x = (m[id] ??= { ...o, points: 0, c: [0, 0, 0] });
      x.points += +pts || 0;
      if (p >= 1 && p <= 3) x.c[p - 1]++;
    };
    const rank = (m) =>
      Object.values(m).sort(
        (a, b) =>
          b.points - a.points ||
          b.c[0] - a.c[0] ||
          b.c[1] - a.c[1] ||
          b.c[2] - a.c[2],
      );
    races.forEach((race, i) => {
      const R = res[i]?.Results || [],
        S = spr[i]?.SprintResults || [];
      if (!R.length) return;
      const tp = {};
      [
        [R, 1],
        [S, 0],
      ].forEach(([rows, full]) =>
        rows.forEach((y) => {
          const id = y.Driver.driverId,
            p = full ? +y.position || 0 : 0;
          last[id] = y.Constructor;
          bump(D, id, { Driver: y.Driver }, y.points, p);
          bump(
            T,
            y.Constructor.constructorId,
            { Constructor: y.Constructor },
            y.points,
            p,
          );
        }),
      );
      const n = race.round;
      snap["dstand_" + n] = {
        StandingsLists: [
          {
            season: String(YEAR),
            round: n,
            DriverStandings: rank(D).map((x, k) => ({
              position: String(k + 1),
              positionText: String(k + 1),
              points: String(x.points),
              wins: String(x.c[0]),
              Driver: x.Driver,
              Constructors: [last[x.Driver.driverId]],
            })),
          },
        ],
      };
      snap["cstand_" + n] = {
        StandingsLists: [
          {
            season: String(YEAR),
            round: n,
            ConstructorStandings: rank(T).map((x, k) => ({
              position: String(k + 1),
              positionText: String(k + 1),
              points: String(x.points),
              wins: String(x.c[0]),
              Constructor: x.Constructor,
            })),
          },
        ],
      };
      snap.driverStandings = snap["dstand_" + n];
      snap.constructorStandings = snap["cstand_" + n];
    });
    const tb = (a) => ({ Races: a.filter(Boolean) });
    snap.races = { Races: races };
    snap.drivers = { Drivers: Object.values(drv) };
    snap.results = tb(res);
    snap.qualifying = tb(qua);
    snap.sprint = tb(spr);
    snap.driverStandings ??= { StandingsLists: [] };
    snap.constructorStandings ??= { StandingsLists: [] };
    return snap;
  }
  let SNAP = null,
    SNAPT = 0;
  async function snapshot() {
    if (!SNAP || Date.now() - SNAPT > 3e5) {
      SNAPT = Date.now();
      SNAP = build().catch((e) => {
        SNAP = null;
        throw e;
      });
    }
    return SNAP;
  }
  async function photo(d) {
    const t = d.url.split("/").pop();
    for (const x of [t, t + "_(motorcyclist)"]) {
      try {
        const j = await (
          await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + x)
        ).json();
        if (
          j.thumbnail &&
          j.type !== "disambiguation" &&
          /motorcycl|moto|racing|rider/i.test(j.description || "")
        )
          return j.thumbnail.source;
      } catch {}
    }
  }
  async function fetchLive(k) {
    const s = await snapshot();
    if (k === "photos") {
      const o = {};
      await pool(s.drivers.Drivers, 6, async (d) => {
        const u = await photo(d);
        if (u) o[d.driverId] = u;
      });
      return o;
    }
    if (!s[k]) throw new Error("Dato non disponibile: " + k);
    return s[k];
  }
  const MEM = {};
  async function load(k) {
    // 1) file salvato dal server in data/ 2) API live 3) cache locale
    if (MEM[k]) return MEM[k];
    try {
      const r = await fetch("data/" + FILE(k) + ".json", { cache: "no-store" });
      if (r.ok) return (MEM[k] = await r.json());
    } catch {}
    try {
      const j = await fetchLive(k);
      MEM[k] = j;
      try {
        localStorage.setItem("mgp_" + k, JSON.stringify(j));
      } catch {}
      return j;
    } catch (e) {
      const c =
        typeof localStorage !== "undefined" && localStorage.getItem("mgp_" + k);
      if (c) return (MEM[k] = JSON.parse(c));
      throw e;
    }
  }
  const MGP = {
    fetchLive,
    FILE,
    load,
    CORE,
    reset: () => {
      for (const k in MEM) delete MEM[k];
      SNAP = null;
    },
  };
  typeof module !== "undefined" ? (module.exports = MGP) : (window.MGP = MGP);
})();
