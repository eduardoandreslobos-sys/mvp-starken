// Aplica el tema guardado antes del primer pintado, para que no parpadee.
try {
  var t = localStorage.getItem("tema");
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
} catch (e) {}
