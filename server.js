// node server.js -> http://localhost:3000
// Serve il sito e tiene aggiornati i JSON in data/<tipo>/ (dall'API ufficiale MotoGP) ogni REFRESH_MIN minuti (default 15)
const http = require("http"),
  fs = require("fs"),
  path = require("path");
const MGP = require("./js/api.js");
const PORT = process.env.PORT || 3000,
  EVERY = (+process.env.REFRESH_MIN || 15) * 60000;
const file = (k) => path.join(__dirname, "data", MGP.FILE(k) + ".json");

async function save(k) {
  try {
    const j = await MGP.fetchLive(k),
      f = file(k);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, JSON.stringify(j));
    console.log("✓", k);
  } catch (e) {
    console.log("✗", k, e.message);
  }
}
let busy = false;
async function update() {
  if (busy) return;
  busy = true;
  console.log("Aggiornamento dati…");
  MGP.reset();
  for (const k of MGP.CORE) {
    // le foto cambiano di rado: una volta al giorno
    if (k === "photos" && fs.existsSync(file(k)) && Date.now() - fs.statSync(file(k)).mtimeMs < 864e5) continue;
    await save(k);
  }
  try {
    const done = JSON.parse(fs.readFileSync(file("results"), "utf8")).Races;
    for (const r of done)
      for (const p of ["dstand", "cstand"]) await save(p + "_" + r.round);
  } catch (e) {
    console.log("Errore classifiche:", e.message);
  }
  await logos();
  console.log("Aggiornamento finito");
  busy = false;
}
// Scarica in locale i loghi (MotoGP e squadre) la prima volta: poi si vedono sempre, anche offline
async function logos() {
  const f = path.join(__dirname, "img", "motogp-logo.png");
  if (!fs.existsSync(f)) {
    try {
      const r = await fetch(
        "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Moto_Gp_logo.svg/1280px-Moto_Gp_logo.svg.png",
        { headers: { "User-Agent": "Report_MotoGP_2026/1.0 (local dashboard)" } },
      );
      if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) {
        fs.mkdirSync(path.dirname(f), { recursive: true });
        fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
        console.log("✓ logo MotoGP");
      } else console.log("✗ logo MotoGP HTTP", r.status);
    } catch (e) {
      console.log("✗ logo MotoGP", e.message);
    }
  }
  try {
    const dir = path.join(__dirname, "img", "teams"),
      EXT = { "image/svg+xml": "svg", "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" },
      seen = {};
    fs.mkdirSync(dir, { recursive: true });
    for (const r of JSON.parse(fs.readFileSync(file("results"), "utf8")).Races)
      for (const y of r.Results) seen[y.Constructor.constructorId] ||= y.Constructor.logo;
    for (const [id, url] of Object.entries(seen)) {
      if (!url || !/^[a-z0-9_]+$/.test(id) || fs.readdirSync(dir).some((n) => n.startsWith(id + "."))) continue;
      try {
        const r = await fetch(url),
          e = EXT[(r.headers.get("content-type") || "").split(";")[0]];
        if (r.ok && e) {
          fs.writeFileSync(path.join(dir, id + "." + e), Buffer.from(await r.arrayBuffer()));
          console.log("✓ logo squadra", id);
        }
      } catch {}
    }
    // Per le squadre rimaste senza logo: cerca il logo su Wikimedia Commons (il titolo del file deve contenere "logo" e il nome)
    const UA = { "User-Agent": "Report_MotoGP_2026/1.0 (local dashboard)" },
      Q = [
        ["pramac", "Pramac Racing logo", /pramac/i],
        ["tech3", "Tech3 Racing logo", /tech ?3/i],
        ["gresini", "Gresini Racing logo", /gresini/i],
        ["vr46", "VR46 Racing Team logo", /vr ?46/i],
        ["trackhouse", "Trackhouse Racing logo", /trackhouse/i],
        ["ducati", "Ducati Corse logo", /ducati/i],
        ["aprilia", "Aprilia Racing logo", /aprilia/i],
        ["ktm", "Red Bull KTM Factory Racing logo", /ktm/i],
        ["lcr", "LCR Honda logo", /lcr/i],
        ["honda", "Honda Racing Corporation logo", /honda|hrc/i],
        ["yamaha", "Yamaha Motor Racing logo", /yamaha/i],
      ];
    for (const id of Object.keys(seen)) {
      if (fs.readdirSync(dir).some((n) => n.startsWith(id + "."))) continue;
      const q = Q.find((x) => id.includes(x[0]));
      if (!q) continue;
      try {
        const j = await (
            await fetch(
              "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo&iiprop=url%7Cmime&iiurlwidth=512&gsrsearch=" +
                encodeURIComponent(q[1]),
              { headers: UA },
            )
          ).json(),
          hit = Object.values(j.query?.pages || {})
            .sort((a, b) => a.index - b.index)
            .find((p) => /logo/i.test(p.title) && q[2].test(p.title) && /^image\/(svg|png)/.test(p.imageinfo?.[0]?.mime || ""));
        if (!hit) continue;
        const ii = hit.imageinfo[0],
          u = ii.mime.includes("svg") ? ii.thumburl || ii.url : ii.url,
          r = await fetch(u, { headers: UA }),
          e = (r.headers.get("content-type") || "").includes("svg") ? "svg" : "png";
        if (r.ok) {
          fs.writeFileSync(path.join(dir, id + "." + e), Buffer.from(await r.arrayBuffer()));
          console.log("✓ logo squadra (Commons)", id, hit.title);
        }
      } catch {}
    }
  } catch (e) {
    console.log("Errore loghi squadre:", e.message);
  }
}
const T = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".txt": "text/plain",
};
http
  .createServer((q, s) => {
    const u = decodeURIComponent(new URL(q.url, "http://x").pathname);
    if (u === "/api/refresh") {
      update();
      return s.end("ok");
    }
    const f = path.join(__dirname, u === "/" ? "index.html" : u);
    if (
      !f.startsWith(__dirname) ||
      !T[path.extname(f)] ||
      !fs.existsSync(f) ||
      fs.statSync(f).isDirectory()
    ) {
      s.statusCode = 404;
      return s.end("404");
    }
    s.setHeader("Content-Type", T[path.extname(f)] + ";charset=utf-8");
    s.setHeader("Cache-Control", "no-store");
    fs.createReadStream(f).pipe(s);
  })
  .listen(PORT, () => {
    console.log("Apri http://localhost:" + PORT);
    update();
    setInterval(update, EVERY);
  });
