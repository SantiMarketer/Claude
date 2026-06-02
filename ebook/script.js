/* ============================================================
   Un Viaje por el Sistema Solar - Ebook infantil
   Lógica de navegación, progreso y quiz
   ============================================================ */

document.addEventListener("DOMContentLoaded", function () {
  /* ---------- Estrellas del fondo ---------- */
  crearEstrellasFondo(90);

  /* ---------- Navegación entre páginas ---------- */
  const paginas = Array.from(document.querySelectorAll(".pagina"));
  const total = paginas.length;
  let actual = 0;

  const btnAnterior = document.getElementById("btnAnterior");
  const btnSiguiente = document.getElementById("btnSiguiente");
  const indicador = document.getElementById("indicador");
  const relleno = document.getElementById("barraRelleno");

  function mostrar(indice) {
    actual = Math.max(0, Math.min(indice, total - 1));

    paginas.forEach(function (pagina, i) {
      pagina.classList.toggle("activa", i === actual);
    });

    // El scroll vuelve arriba al cambiar de página
    if (paginas[actual]) {
      paginas[actual].scrollTop = 0;
    }

    btnAnterior.disabled = actual === 0;
    btnSiguiente.disabled = actual === total - 1;

    indicador.textContent = "Página " + (actual + 1) + " de " + total;
    relleno.style.width = ((actual + 1) / total) * 100 + "%";
  }

  function siguiente() { mostrar(actual + 1); }
  function anterior() { mostrar(actual - 1); }

  btnSiguiente.addEventListener("click", siguiente);
  btnAnterior.addEventListener("click", anterior);

  // Botón "¡Empezar la aventura!" de la portada
  const btnEmpezar = document.getElementById("btnEmpezar");
  if (btnEmpezar) {
    btnEmpezar.addEventListener("click", siguiente);
  }

  // Navegación con el teclado (flechas)
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") siguiente();
    if (e.key === "ArrowLeft") anterior();
  });

  // Navegación táctil (deslizar en móviles)
  let inicioX = null;
  const zona = document.querySelector(".paginas");
  zona.addEventListener("touchstart", function (e) {
    inicioX = e.changedTouches[0].clientX;
  }, { passive: true });
  zona.addEventListener("touchend", function (e) {
    if (inicioX === null) return;
    const dx = e.changedTouches[0].clientX - inicioX;
    if (dx < -50) siguiente();
    if (dx > 50) anterior();
    inicioX = null;
  }, { passive: true });

  mostrar(0);

  /* ---------- Quiz ---------- */
  configurarQuiz();
});

/* Crea estrellas titilantes repartidas por el fondo */
function crearEstrellasFondo(cantidad) {
  const contenedor = document.querySelector(".estrellas-fondo");
  if (!contenedor) return;

  for (let i = 0; i < cantidad; i++) {
    const estrella = document.createElement("span");
    estrella.className = "estrella-fondo";
    const tam = Math.random() * 3 + 1;
    estrella.style.width = tam + "px";
    estrella.style.height = tam + "px";
    estrella.style.left = Math.random() * 100 + "%";
    estrella.style.top = Math.random() * 100 + "%";
    estrella.style.setProperty("--dur", (Math.random() * 3 + 1.5) + "s");
    estrella.style.animationDelay = Math.random() * 3 + "s";
    contenedor.appendChild(estrella);
  }
}

/* Maneja la lógica del quiz interactivo */
function configurarQuiz() {
  const preguntas = document.querySelectorAll(".pregunta");
  const resultado = document.getElementById("quizResultado");
  if (!preguntas.length) return;

  let aciertos = 0;
  let respondidas = 0;
  const totalPreguntas = preguntas.length;

  preguntas.forEach(function (pregunta) {
    const opciones = pregunta.querySelectorAll(".opcion");
    let yaRespondida = false;

    opciones.forEach(function (opcion) {
      opcion.addEventListener("click", function () {
        if (yaRespondida) return;
        yaRespondida = true;
        respondidas++;

        const esCorrecta = opcion.dataset.correcta === "true";
        if (esCorrecta) {
          opcion.classList.add("correcta");
          aciertos++;
        } else {
          opcion.classList.add("incorrecta");
          // Resaltamos también la respuesta correcta
          opciones.forEach(function (o) {
            if (o.dataset.correcta === "true") o.classList.add("correcta");
          });
        }

        // Bloqueamos el resto de opciones
        opciones.forEach(function (o) { o.style.pointerEvents = "none"; });

        if (respondidas === totalPreguntas) {
          mostrarResultado(aciertos, totalPreguntas, resultado);
        }
      });
    });
  });
}

function mostrarResultado(aciertos, total, elemento) {
  if (!elemento) return;
  let mensaje = "Has acertado " + aciertos + " de " + total + ". ";
  if (aciertos === total) {
    mensaje += "🚀 ¡Eres un astronauta experto!";
  } else if (aciertos >= total / 2) {
    mensaje += "🌟 ¡Muy bien! Sigue explorando el espacio.";
  } else {
    mensaje += "🪐 ¡Buen intento! Vuelve a leer el libro y prueba otra vez.";
  }
  elemento.textContent = mensaje;
}
