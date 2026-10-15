// Intro splash: resta visibile ~2.4s poi sfuma. Click o tasto per saltarla.
(function () {
  var root = document.documentElement,
    el = document.getElementById("intro");
  if (!el) return;
  if (!root.classList.contains("intro-on")) {
    el.remove();
    return;
  }
  var reduce =
      window.matchMedia &&
      matchMedia("(prefers-reduced-motion: reduce)").matches,
    MIN = reduce ? 600 : 2400,
    t0 = Date.now(),
    done = false;
  function end() {
    if (done) return;
    done = true;
    el.classList.add("out");
    setTimeout(function () {
      el.remove();
      root.classList.remove("intro-on");
    }, 650);
  }
  function plan() {
    setTimeout(end, Math.max(0, MIN - (Date.now() - t0)));
  }
  if (document.readyState === "complete") plan();
  else addEventListener("load", plan);
  setTimeout(end, 4500); // sicurezza
  el.addEventListener("click", end);
  addEventListener("keydown", end, { once: true });
})();
