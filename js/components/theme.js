// Tema applicato subito (evita il lampo) + intro a ogni ingresso nel sito
(function () {
  var r = document.documentElement;
  try {
    var T = localStorage.getItem("mgp_theme");
    if (T) r.dataset.theme = T;
  } catch (e) {}
  r.classList.add("intro-on");
  addEventListener("pageshow", function (e) {
    if (e.persisted) location.reload();
  });
})();
