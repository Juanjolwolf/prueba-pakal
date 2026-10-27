// Si el panel guarda rutas con "/" al inicio, se la quitamos
// para que funcione aunque el sitio viva en una subcarpeta.
function ruta(r) {
  return (r || '').replace(/^\//, '');
}

function esc(t) {
  return String(t ?? '').replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

async function cargar(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error('No se pudo cargar ' + url);
  return r.json();
}

async function pintarPortada() {
  const d = await cargar('datos/inicio.json');
  document.getElementById('banner-img').src = ruta(d.imagen);
  document.getElementById('banner-img').alt = d.alt || '';
  document.getElementById('banner-titulo').textContent = d.titulo || '';
  document.getElementById('banner-subtitulo').textContent = d.subtitulo || '';
}

async function pintarTalleres() {
  const d = await cargar('datos/talleres.json');
  const lista = d.talleres || [];
  const cont = document.getElementById('lista-talleres');

  if (lista.length === 0) {
    cont.textContent = 'Todavía no hay talleres.';
    return;
  }

  cont.innerHTML = lista.map(function (t) {
    return '<article class="taller">' +
      '<h2>' + esc(t.titulo) + '</h2>' +
      '<p class="fecha">' + esc(t.fecha) + '</p>' +
      (t.imagen ? '<img src="' + esc(ruta(t.imagen)) + '" alt="' + esc(t.alt) + '">' : '') +
      '<p>' + esc(t.descripcion) + '</p>' +
      '</article>';
  }).join('');
}

(async function () {
  try {
    if (document.getElementById('banner')) await pintarPortada();
    if (document.getElementById('lista-talleres')) await pintarTalleres();
  } catch (e) {
    console.error(e);
    const aviso = document.querySelector('main') || document.body;
    aviso.insertAdjacentHTML('afterbegin',
      '<p style="color:#ff8080">No se pudo cargar el contenido.</p>');
  }
})();
