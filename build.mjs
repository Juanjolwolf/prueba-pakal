// build.mjs
// Lee los talleres de contenido/talleres/*.md y genera el sitio completo en dist/
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { marked } from 'marked';

const OUT = 'dist';
const SRC_TALLERES = 'contenido/talleres';
const SITE_URL = process.env.SITE_URL ? process.env.SITE_URL.replace(/\/*$/, '/') : '';

// ---------- utilidades ----------
const esc = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

function slugify(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Separa el bloque "---" (datos) del texto largo
function leerArchivo(ruta) {
  const texto = fs
    .readFileSync(ruta, 'utf8')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');
  const m = texto.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { datos: {}, cuerpo: texto };
  return { datos: yaml.load(m[1]) || {}, cuerpo: m[2] };
}

// YAML convierte 2026-11-05 en un objeto Date; lo volvemos a texto
function aISO(valor) {
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor ?? '').slice(0, 10);
}

function fechaLarga(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

// El panel puede guardar "/img/foto.png" o "img/foto.png": aceptamos ambas
function normalizarImagen(valor) {
  if (!valor) return null;
  const v = String(valor).trim();
  if (/^https?:\/\//.test(v)) return { externa: true, ruta: v };
  return { externa: false, ruta: v.replace(/^\/+/, '').replace(/ /g, '%20') };
}

function escribir(rel, contenido) {
  const destino = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, contenido);
}

// ---------- plantilla común (menú, cabecera, pie) ----------
function pagina({ titulo, descripcion, base, ruta, imagen, cuerpo }) {
  const url = SITE_URL ? SITE_URL + ruta : '';
  const imgOG = imagen ? (imagen.externa ? imagen.ruta : SITE_URL + imagen.ruta) : '';
  const social = SITE_URL
    ? `
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(titulo)}">
  <meta property="og:description" content="${esc(descripcion)}">
  <meta property="og:url" content="${esc(url)}">${imgOG ? `
  <meta property="og:image" content="${esc(imgOG)}">` : ''}`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descripcion)}">${social}
  <link rel="stylesheet" href="${base}css/estilos.css">
</head>
<body>
  <header class="menu">
    <strong>PAKAL (prueba)</strong>
    <nav>
      <a href="${base}index.html">Inicio</a>
      <a href="${base}talleres.html">Talleres</a>
    </nav>
  </header>
  <main>
${cuerpo}
  </main>
</body>
</html>
`;
}

// ---------- 1. copiar lo que ya existe ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const item of ['index.html', 'css', 'js', 'img', 'datos']) {
  if (fs.existsSync(item)) fs.cpSync(item, path.join(OUT, item), { recursive: true });
}

// ---------- 2. leer los talleres ----------
const talleres = [];
if (fs.existsSync(SRC_TALLERES)) {
  for (const archivo of fs.readdirSync(SRC_TALLERES).filter((f) => f.endsWith('.md'))) {
    const { datos, cuerpo } = leerArchivo(path.join(SRC_TALLERES, archivo));

    if (datos.publicado === false || datos.publicado === 'false') continue; // borrador
    if (!datos.titulo) {
      console.warn(`Aviso: ${archivo} no tiene título y se omite.`);
      continue;
    }

    const slug = slugify(path.basename(archivo, '.md'));
    talleres.push({
      slug,
      titulo: String(datos.titulo),
      fecha: aISO(datos.fecha),
      resumen: datos.resumen ? String(datos.resumen) : '',
      imagen: normalizarImagen(datos.imagen),
      alt: datos.alt ? String(datos.alt) : '',
      html: marked.parse(cuerpo),
    });
  }
}
talleres.sort((a, b) => b.fecha.localeCompare(a.fecha)); // más recientes primero

// ---------- 3. una página por taller ----------
for (const t of talleres) {
  const base = '../../';
  const src = t.imagen ? (t.imagen.externa ? t.imagen.ruta : base + t.imagen.ruta) : '';
  const cuerpo = `    <a class="volver" href="${base}talleres.html">&larr; Todos los talleres</a>
    <article class="taller-detalle">
      <h1>${esc(t.titulo)}</h1>
      ${t.fecha ? `<p class="fecha">${esc(fechaLarga(t.fecha))}</p>` : ''}
      ${src ? `<img src="${esc(src)}" alt="${esc(t.alt)}">` : ''}
      <div class="contenido">
${t.html}
      </div>
    </article>`;

  escribir(
    `talleres/${t.slug}/index.html`,
    pagina({
      titulo: `${t.titulo} | Talleres | Pakal (prueba)`,
      descripcion: t.resumen || `Taller: ${t.titulo}`,
      base,
      ruta: `talleres/${t.slug}/`,
      imagen: t.imagen,
      cuerpo,
    })
  );
}

// ---------- 4. el listado (talleres.html) ----------
const tarjetas = talleres.length
  ? talleres
      .map((t) => {
        const src = t.imagen ? t.imagen.ruta : '';
        return `    <article class="taller">
      <a class="tarjeta-link" href="talleres/${t.slug}/">
        <h2>${esc(t.titulo)}</h2>
        ${t.fecha ? `<p class="fecha">${esc(fechaLarga(t.fecha))}</p>` : ''}
        ${src ? `<img src="${esc(src)}" alt="${esc(t.alt)}" loading="lazy">` : ''}
        ${t.resumen ? `<p>${esc(t.resumen)}</p>` : ''}
      </a>
    </article>`;
      })
      .join('\n')
  : '    <p>Todavía no hay talleres publicados.</p>';

escribir(
  'talleres.html',
  pagina({
    titulo: 'Talleres | Pakal (prueba)',
    descripcion: 'Lista de talleres de prueba.',
    base: '',
    ruta: 'talleres.html',
    imagen: talleres.find((t) => t.imagen)?.imagen ?? null,
    cuerpo: `    <h1>Talleres</h1>\n${tarjetas}`,
  })
);

// ---------- 5. sitemap y robots (solo si conocemos la dirección) ----------
if (SITE_URL) {
  const urls = ['', 'talleres.html', ...talleres.map((t) => `talleres/${t.slug}/`)];
  escribir(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(SITE_URL + u)}</loc></url>`).join('\n')}
</urlset>
`
  );
  escribir('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
}

console.log(`Sitio generado en ${OUT}/ con ${talleres.length} taller(es).`);
