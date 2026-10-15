async function init() {
  const L = (k) => MGP.load(k).catch(() => null);
  const [ra, dr, pho, re, qu, sp, dsd, csd] = await Promise.all(MGP.CORE.map(L));
  S.races = ra?.Races || [];
  S.drivers = dr?.Drivers || [];
  S.photos = pho || {};
  S.res = byRound(re);
  S.q = byRound(qu);
  S.sp = byRound(sp);
  S.ds = ds(dsd);
  S.cs = cs(csd);
  S.dc = Object.fromEntries(
    S.ds.map((s) => [s.Driver.driverId, s.Constructors?.at(-1)?.constructorId]),
  );
  for (const r of S.races) ISO[r.Circuit.Location.country] = r.Circuit.Location.iso || ISO[r.Circuit.Location.country];
  for (const d of S.drivers) if (d.iso) ISO[d.nationality] = d.iso;
  for (const c of S.cs.map((x) => x.Constructor).concat(Object.values(S.res).flatMap((r) => r.Results.map((y) => y.Constructor)))) {
    if (c.color) COL[c.constructorId] = c.color;
    if (c.logo) LG[c.constructorId] = c.logo;
  }
  if (!S.races.length) {
    delete S.races;
    throw new Error(
      "Nessun dato: controlla la connessione o avvia node server.js",
    );
  }
}
const lastDone = () => Math.max(0, ...Object.keys(S.res).map(Number));
