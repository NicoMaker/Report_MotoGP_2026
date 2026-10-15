// Segmento rosso sotto la voce attiva del menu (riga a tutta larghezza dell'header)
function bar() {
  const b = $("#nb"),
    a = document.querySelector("nav a.on");
  if (!b) return;
  if (!a) {
    b.style.opacity = 0;
    return;
  }
  const h = b.parentNode.getBoundingClientRect(),
    r = a.getBoundingClientRect();
  b.style.opacity = 1;
  b.style.left = Math.max(0, r.left - h.left) + "px";
  b.style.width = Math.min(r.width, h.right - r.left) + "px";
}
addEventListener("resize", bar);
addEventListener("load", bar);
document.querySelector("nav").addEventListener("scroll", bar);
async function route() {
  const [, v = "", a, b] = location.hash.split("/");
  document
    .querySelectorAll("nav a")
    .forEach((x) =>
      x.classList.toggle(
        "on",
        x.getAttribute("href") ===
          "#/" + ({ driver: "drivers", team: "teams" }[v] ?? v),
      ),
    );
  bar();
  try {
    if (!S.races) {
      A.innerHTML = '<div class="ld"><i></i>Caricamento dati…</div>';
      await init();
    }
    ({
      "": cal,
      drivers,
      teams,
      makes,
      team: () => team(a),
      driver: () => driver(a),
      race: () => race(a, b),
      search: () => searchPage(a),
    })[v]?.();
    scrollTo(0, 0);
  } catch (e) {
    A.innerHTML = `<p class="err">${e.message}</p>`;
  }
}
$("#rf").onclick = () => {
  MGP.reset();
  for (const k in S) delete S[k];
  route();
};
addEventListener("hashchange", route);
route();
