const $ = (s) => document.querySelector(s),
  A = $("#app"),
  S = {};
const COL = {};
// Colori di riserva per parola chiave (se l'API non fornisce il colore della squadra)
const KC = [
  ["ducati", "#e10600"],
  ["pramac", "#d4af37"],
  ["gresini", "#1e6fd9"],
  ["vr46", "#c8f000"],
  ["aprilia", "#7b2cbf"],
  ["trackhouse", "#e4007c"],
  ["ktm", "#ff6600"],
  ["tech3", "#ff6600"],
  ["honda", "#f0f0f0"],
  ["lcr", "#e4002b"],
  ["yamaha", "#1d4ed8"],
  ["monster", "#1d4ed8"],
  ["prima", "#1d4ed8"],
];
const col = (id) =>
  COL[id] ||
  KC.find((k) => id.includes(k[0]))?.[1] ||
  "#" +
    (
      (Math.abs([...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) %
        0xaaaaaa) +
      0x333333
    )
      .toString(16)
      .slice(0, 6)
      .padStart(6, "0");
const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const pod = (rows) => rows.map((r) => "p" + r[0]);
const byRound = (l) =>
  Object.fromEntries((l?.Races || []).map((r) => [r.round, r]));
const fd = (r) =>
  new Date(r.date + "T" + (r.time || "12:00:00Z")).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
const sec = (t) => {
  if (!t) return 1e9;
  const p = t.split(":");
  return p.length > 1 ? +p[0] * 60 + +p[1] : +p[0];
};
const ds = (l) => l?.StandingsLists?.[0]?.DriverStandings || [],
  cs = (l) => l?.StandingsLists?.[0]?.ConstructorStandings || [];
// Bandiere come immagini SVG locali (img/flags): le emoji-bandiera su Windows si vedono come lettere (US, IT…)
const ISO = {
  Australia: "au",
  China: "cn",
  Japan: "jp",
  USA: "us",
  Canada: "ca",
  Monaco: "mc",
  Spain: "es",
  Austria: "at",
  UK: "gb",
  Belgium: "be",
  Hungary: "hu",
  Netherlands: "nl",
  Italy: "it",
  Azerbaijan: "az",
  Malaysia: "my",
  Singapore: "sg",
  Mexico: "mx",
  Brazil: "br",
  Qatar: "qa",
  UAE: "ae",
  Bahrain: "bh",
  "Saudi Arabia": "sa",
  Portugal: "pt",
  Turkey: "tr",
  Germany: "de",
  France: "fr",
  Russia: "ru",
  "South Africa": "za",
  Argentina: "ar",
  Korea: "kr",
  India: "in",
  Switzerland: "ch",
  Sweden: "se",
  Thai: "th",
  Spanish: "es",
  Italian: "it",
  British: "gb",
  Brazilian: "br",
  Finnish: "fi",
  Argentine: "ar",
  French: "fr",
  German: "de",
  "New Zealander": "nz",
  Monegasque: "mc",
  Australian: "au",
  Mexican: "mx",
  Canadian: "ca",
  Japanese: "jp",
  Dutch: "nl",
  Austrian: "at",
  American: "us",
  Danish: "dk",
  Chinese: "cn",
  Swiss: "ch",
  Polish: "pl",
  Swedish: "se",
  Belgian: "be",
  Russian: "ru",
  Hungarian: "hu",
  Portuguese: "pt",
  Indonesian: "id",
  Colombian: "co",
  Venezuelan: "ve",
  Estonian: "ee",
  Irish: "ie",
  Czech: "cz",
};
const flag = (k, c = "") =>
  ISO[k]
    ? `<img class="flag ${c}" src="img/flags/${ISO[k]}.svg" alt="${k}" title="${k}" loading="lazy" onerror="this.onerror=null;this.src='https://flagcdn.com/${ISO[k]}.svg'">`
    : "🏁";
// Date all'italiana ("23 marzo 1996") ed età calcolata ad oggi
const bd = (s) => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};
const itDate = (s, mese = "long") =>
  bd(s)?.toLocaleDateString("it-IT", {
    day: "numeric",
    month: mese,
    year: "numeric",
  }) || "";
const age = (s) => {
  const b = bd(s);
  if (!b) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (
    n.getMonth() < b.getMonth() ||
    (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())
  )
    a--;
  return a;
};
const bio = (d) =>
  d?.dateOfBirth
    ? `nato il ${itDate(d.dateOfBirth)} · ${age(d.dateOfBirth)} anni`
    : "";
