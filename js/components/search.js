// Ricerca globale (header + pagina risultati), filtri nelle tabelle/griglie, ordinamento colonne, tema
function sIndex() {
  if (S._ix) return S._ix;
  const ix = [];
  S.drivers.forEach((d) =>
    ix.push({
      k: ph(d),
      t: `${d.givenName} ${d.familyName}`,
      s: `#${d.permanentNumber || "-"} · ${d.nationality}`,
      h: `#/driver/${d.driverId}`,
      x: norm(
        [
          d.givenName,
          d.familyName,
          d.code,
          d.permanentNumber,
          d.nationality,
        ].join(" "),
      ),
    }),
  );
  S.cs.forEach((c) =>
    ix.push({
      k: ticon(c.Constructor.constructorId, c.Constructor.name, 30),
      t: c.Constructor.name,
      s: `Squadra · ${c.points} pt`,
      h: `#/team/${c.Constructor.constructorId}`,
      x: norm(
        c.Constructor.name +
          " " +
          (c.Constructor.nationality || "") +
          " squadra team",
      ),
    }),
  );
  S.races.forEach((r) => {
    const l = r.Circuit.Location,
      w = S.res[r.round]?.Results?.[0]?.Driver;
    ix.push({
      k: `<span class="fg" style="font-size:24px">${flag(l.country)}</span>`,
      t: r.raceName,
      s: `Gara ${r.round} · ${l.locality}, ${l.country}`,
      h: `#/race/${r.round}`,
      x: norm(
        [
          r.raceName,
          r.Circuit.circuitName,
          l.locality,
          l.country,
          "gara",
          r.round,
          w?.familyName,
        ].join(" "),
      ),
    });
  });
  return (S._ix = ix);
}
const sFind = (q) => {
  if (!S.races) return [];
  const t = norm(q).split(/\s+/).filter(Boolean);
  return t.length
    ? sIndex().filter((i) => t.every((w) => i.x.includes(w)))
    : [];
};
function searchPage(q) {
  q = decodeURIComponent(q || "");
  const r = sFind(q);
  A.innerHTML = `<h2>Risultati per “${esc(q)}”</h2>${r.length ? `<div class="grid">${r.map((i) => `<a class="card" href="${i.h}"><small>${i.k}</small><h3>${esc(i.t)}</h3><p>${esc(i.s)}</p></a>`).join("")}</div>` : '<p class="mut">Nessun risultato.</p>'}`;
}
const qi = $("#q"),
  sr = $("#sr");
const show = () => {
  const v = qi.value.trim(),
    r = sFind(v);
  if (!v) return (sr.hidden = true);
  sr.innerHTML = r.length
    ? r
        .slice(0, 8)
        .map(
          (i) =>
            `<a href="${i.h}"><span>${i.k}</span><b>${esc(i.t)}</b><small>${esc(i.s)}</small></a>`,
        )
        .join("") +
      (r.length > 8
        ? `<a class="all" href="#/search/${encodeURIComponent(v)}">Vedi tutti (${r.length}) →</a>`
        : "")
    : '<p class="mut">Nessun risultato</p>';
  sr.hidden = false;
};
qi.oninput = qi.onfocus = show;
qi.onkeydown = (e) => {
  if (e.key === "Enter" && qi.value.trim()) {
    location.hash = "#/search/" + encodeURIComponent(qi.value.trim());
    sr.hidden = true;
    qi.blur();
  }
  if (e.key === "Escape") ((sr.hidden = true), qi.blur());
};
addEventListener("hashchange", () => (sr.hidden = true));
document.addEventListener("keydown", (e) => {
  if (
    e.key === "/" &&
    !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)
  ) {
    e.preventDefault();
    qi.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".sb")) sr.hidden = true;
  const th = e.target.closest("th");
  if (!th) return;
  const tb = th.closest("table").tBodies[0],
    i = th.cellIndex,
    d = th.dataset.d === "1" ? -1 : 1;
  th.parentNode.querySelectorAll("th").forEach((x) => delete x.dataset.d);
  th.dataset.d = d;
  const key = (r) => {
    const t = r.cells[i].textContent.trim().replace(",", "."),
      m = t.match(/^\+?(\d+):(\d+(?:\.\d+)?)/),
      n = m ? +m[1] * 60 + +m[2] : parseFloat(t);
    return isNaN(n) ? t.toLowerCase() : n;
  };
  [...tb.rows]
    .sort((a, b) => {
      const x = key(a),
        y = key(b);
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y), "it", { numeric: true })) * d
      );
    })
    .forEach((r) => tb.appendChild(r));
});
// Filtro live su qualsiasi input.tf: filtra righe della tabella o card della griglia che segue
document.addEventListener("input", (e) => {
  if (!e.target.classList.contains("tf")) return;
  const t = e.target.nextElementSibling,
    w = norm(e.target.value).split(/\s+/).filter(Boolean);
  if (!t) return;
  (t.classList.contains("grid")
    ? [...t.children]
    : [...t.querySelectorAll("tbody tr")]
  ).forEach((el) => {
    const x = norm(
      el.textContent + " " + (el.querySelector("img,i.ph") ? "" : ""),
    );
    el.hidden = !w.every((k) => x.includes(k));
  });
});
const th = $("#th"),
  root = document.documentElement;
try {
  const T = localStorage.getItem("mgp_theme");
  if (T) root.dataset.theme = T;
} catch {}
th.onclick = () => {
  const n = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = n;
  try {
    localStorage.setItem("mgp_theme", n);
  } catch {}
};

// Select con ricerca: apri/chiudi, filtro live, scelta con click o Invio, Esc per chiudere
const ssClose = () =>
  document.querySelectorAll(".ssp").forEach((p) => (p.hidden = true));
const ssFilter = (p) => {
  const w = norm(p.querySelector(".ssi").value).split(/\s+/).filter(Boolean);
  let n = 0;
  p.querySelectorAll("li").forEach((li) => {
    li.hidden = !w.every((k) => li.dataset.x.includes(k));
    if (!li.hidden) n++;
  });
  p.querySelector(".ssn").hidden = n > 0;
};
const ssPick = (li) => {
  const box = li.closest(".ss"),
    s = box.querySelector("select");
  s.value = li.dataset.v;
  box.querySelector(".ssb").innerHTML = li.innerHTML + "<em>▾</em>";
  box.querySelectorAll("li").forEach((x) => x.classList.toggle("on", x === li));
  ssClose();
  s.dispatchEvent(new Event("change", { bubbles: true }));
};
document.addEventListener("click", (e) => {
  const b = e.target.closest(".ssb"),
    li = e.target.closest(".ssl li");
  if (li) return ssPick(li);
  if (b) {
    const p = b.parentNode.querySelector(".ssp"),
      open = p.hidden;
    ssClose();
    p.hidden = !open;
    if (open) {
      const i = p.querySelector(".ssi");
      i.value = "";
      ssFilter(p);
      i.focus();
      p.querySelector("li.on")?.scrollIntoView({ block: "center" });
    }
    return;
  }
  if (!e.target.closest(".ssp")) ssClose();
});
document.addEventListener("input", (e) => {
  if (e.target.classList.contains("ssi")) ssFilter(e.target.closest(".ssp"));
});
document.addEventListener("keydown", (e) => {
  if (!e.target.classList?.contains("ssi")) return;
  if (e.key === "Escape") {
    ssClose();
    e.target.closest(".ss").querySelector(".ssb").focus();
  }
  if (e.key === "Enter") {
    e.preventDefault();
    const li = [...e.target.closest(".ssp").querySelectorAll("li")].find(
      (x) => !x.hidden,
    );
    if (li) ssPick(li);
  }
});

// Frecce: striscia scorrevole (loghi squadre) e tasti ← → per precedente/successivo (pilota, squadra, gara)
const wallSync = (w) => {
  const b = w.parentNode;
  b.querySelector(".wl").classList.toggle("off", w.scrollLeft < 4);
  b.querySelector(".wr").classList.toggle(
    "off",
    w.scrollLeft + w.clientWidth > w.scrollWidth - 4,
  );
};
document.addEventListener("click", (e) => {
  const b = e.target.closest(".wb");
  if (!b) return;
  const w = b.parentNode.querySelector(".wall");
  w.scrollBy({
    left: (b.classList.contains("wl") ? -1 : 1) * w.clientWidth * 0.75,
    behavior: "smooth",
  });
});
document.addEventListener(
  "scroll",
  (e) => {
    if (e.target.classList?.contains("wall")) wallSync(e.target);
  },
  true,
);
addEventListener("resize", () =>
  document.querySelectorAll(".wall").forEach(wallSync),
);
document.addEventListener("keydown", (e) => {
  if (
    e.altKey ||
    e.ctrlKey ||
    e.metaKey ||
    /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)
  )
    return;
  const k =
    e.key === "ArrowLeft" ? "prev" : e.key === "ArrowRight" ? "next" : "";
  if (k) document.querySelector(`.nv a[rel="${k}"]`)?.click();
});
