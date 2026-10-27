// Solo se usa en la portada: lee datos/inicio.json y rellena el banner.

// Si el panel guarda rutas con "/" al inicio, se la quitamos
// para que funcione aunque el sitio viva en una subcarpeta.
function ruta(r) {
  return (r || '').replace(/^\/+/, '').replace(/ /g, '%20');
}

async function cargar(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo cargar ' + url);
  return r.json();
}

async function pintarPortada() {
  const d = await cargar('datos/inicio.json');
  const img = document.getElementById('banner-img');

  if (d.imagen) {
    img.src = ruta(d.imagen);
    img.alt = d.alt || '';
  } else {
    img.remove(); // sin imagen: queda solo el fondo de color
  }

  document.getElementById('banner-titulo').textContent = d.titulo || '';
  document.getElementById('banner-subtitulo').textContent = d.subtitulo || '';
}

(async function () {
  try {
    if (document.getElementById('banner')) await pintarPortada();
  } catch (e) {
    console.error(e);
    const aviso = document.querySelector('main') || document.body;
    aviso.insertAdjacentHTML('afterbegin',
      '<p style="color:#ff8080">No se pudo cargar el contenido.</p>');
  }
})();
