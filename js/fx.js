// Effetti: bagliore che segue il mouse, conteggio animato dei numeri, barra di avanzamento scroll.
(function () {
  const bar = document.createElement("div");
  bar.id = "sp";
  document.body.appendChild(bar);
  const sc = () => {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
  };
  addEventListener("scroll", sc, { passive: true });
  document.addEventListener("pointermove", (e) => {
    const c = e.target.closest && e.target.closest(".card,.rc,.tc,.dc2,.trw,.next,.pc");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", e.clientX - r.left + "px");
    c.style.setProperty("--my", e.clientY - r.top + "px");
  });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function count(el) {
    const t = [...el.childNodes].find((n) => n.nodeType === 3 && /^\s*\d+\s*$/.test(n.nodeValue));
    if (!t || el.dataset.cu) return;
    el.dataset.cu = 1;
    const to = +t.nodeValue, t0 = performance.now();
    (function f(now) {
      const p = Math.min(1, (now - t0) / 800);
      t.nodeValue = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  const run = () => document.querySelectorAll(".stats b,.cd b,.dc2 .big").forEach(count);
  new MutationObserver(run).observe(document.getElementById("app"), { childList: true });
  run();
})();
