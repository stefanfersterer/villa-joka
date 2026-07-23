import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templatePath = path.join(root, 'src', 'index.template.html');
const contentPath = path.join(root, 'content.json');
const publicPath = path.join(root, 'public');
const outputPath = path.join(root, 'dist');
const languages = ['de', 'en', 'uk'];

const [templateRaw, contentRaw] = await Promise.all([
  readFile(templatePath, 'utf8'),
  readFile(contentPath, 'utf8')
]);

let content;
try {
  content = JSON.parse(contentRaw);
} catch (error) {
  throw new Error(`content.json ist kein gültiges JSON: ${error.message}`);
}

validateContent(content);
await validateImages(content.gallery || []);

let html = templateRaw.replaceAll('\0', '');
html = removeInjectedBrowserMarkup(html);
html = ensureDoctype(html);
html = renderPage(html, content);

await rm(outputPath, { recursive: true, force: true });
await mkdir(outputPath, { recursive: true });
await cp(publicPath, outputPath, { recursive: true });
await writeFile(path.join(outputPath, 'index.html'), html, 'utf8');

console.log(`Villa Joka gebaut: ${path.relative(root, path.join(outputPath, 'index.html'))}`);

function validateContent(data) {
  const required = [
    'contact', 'hero', 'about', 'reviews', 'gallery', 'prices_villa',
    'prices_villa_notes', 'prices_apt', 'prices_apt_notes', 'hero_pills',
    'highlights', 'footer_tagline', 'distances', 'amenities', 'site', 'seo',
    'copy', 'legal'
  ];
  for (const key of required) {
    if (data[key] === undefined || data[key] === null) {
      throw new Error(`Pflichtbereich „${key}“ fehlt in content.json.`);
    }
  }
  for (const lang of languages) {
    for (const [area, key] of [
      ['hero', `sub_${lang}`],
      ['about', `heading_${lang}`],
      ['about', `body_${lang}`]
    ]) {
      if (!String(data[area]?.[key] || '').trim()) {
        throw new Error(`Pflichtfeld „${area}.${key}“ fehlt oder ist leer.`);
      }
    }
  }
  if (!Array.isArray(data.gallery) || data.gallery.length === 0) {
    throw new Error('Die Galerie muss mindestens ein Bild enthalten.');
  }
}

async function validateImages(gallery) {
  for (const item of gallery) {
    for (const value of [item.src, item._full].filter(Boolean)) {
      const src = safeAssetPath(value);
      if (!src) throw new Error(`Ungültiger Galeriepfad: ${value || '(leer)'}`);
      try {
        await stat(path.join(publicPath, src));
      } catch {
        throw new Error(`Galeriebild fehlt: public/${src}`);
      }
    }
  }
}

function removeInjectedBrowserMarkup(source) {
  const marker = '<div id="diigo-video-capture"';
  const start = source.indexOf(marker);
  if (start === -1) return source;
  const loader = source.indexOf('/* === CMS LOADER', start);
  if (loader === -1) return source.slice(0, start) + '\n</body>\n</html>\n';
  const scriptEnd = source.indexOf('</script>', loader);
  if (scriptEnd === -1) throw new Error('Der alte CMS-Loader ist unvollständig.');
  return source.slice(0, start) + source.slice(scriptEnd + '</script>'.length);
}

function ensureDoctype(source) {
  const clean = source.trimStart();
  return /^<!doctype html>/i.test(clean) ? clean : `<!DOCTYPE html>\n${clean}`;
}

function renderPage(source, data) {
  const mapAddress = String(data.site?.address_de || '').replace(/\s*·\s*/g, ', ');
  data = {
    ...data,
    site: {
      ...data.site,
      map_embed_url: `https://www.google.com/maps?q=${encodeURIComponent(mapAddress)}&output=embed`
    }
  };
  let result = source;

  result = replaceElementTextByClass(result, 'p', 'hero-tag', data.hero, 'sub_', true);
  result = replaceDivInner(result, 'pills', renderPills(data.hero_pills));
  result = replaceDivInner(result, 'hbar-inner', renderHighlights(data.highlights));

  let villa = getSection(result, 'VILLA', 'GALLERY');
  villa = replaceElementTextByClass(villa, 'h2', 'sec-h', data.about, 'heading_', true);
  villa = replaceBeforeDivClass(villa, 'villa-text fu vis', 'villa-stats', renderAbout(data.about));
  villa = replaceDivInner(villa, 'villa-stats', renderStats(data));
  result = replaceSection(result, 'VILLA', 'GALLERY', villa);

  let gallery = getSection(result, 'GALLERY', 'AMENITIES');
  gallery = replaceDivInner(gallery, 'gallery-grid', renderGallery(data.gallery));
  result = replaceSection(result, 'GALLERY', 'AMENITIES', gallery);

  let amenities = getSection(result, 'AMENITIES', 'PRICES');
  amenities = replaceDivInner(amenities, 'amen-grid', renderAmenities(data.amenities));
  result = replaceSection(result, 'AMENITIES', 'PRICES', amenities);

  let prices = getSection(result, 'PRICES', 'LOCATION');
  prices = replaceTagInner(prices, 'tbody', renderPrices(data.prices_villa), 0);
  prices = replaceTagInner(prices, 'tbody', renderPrices(data.prices_apt), 1);
  prices = replaceDivInner(prices, 'price-note', renderNotes(data.prices_villa_notes), 0);
  prices = replaceDivInner(prices, 'price-note', renderNotes(data.prices_apt_notes), 1);
  result = replaceSection(result, 'PRICES', 'LOCATION', prices);

  let location = getSection(result, 'LOCATION', 'REVIEWS');
  location = replaceDivInner(location, 'dist-list', renderDistances(data.distances));
  result = replaceSection(result, 'LOCATION', 'REVIEWS', location);

  let reviews = getSection(result, 'REVIEWS', 'BOOKING');
  reviews = reviews.replace(
    '<div class="review-hub fu vis">',
    `${renderReviews(data.reviews)}\n    <div class="review-hub fu vis">`
  );
  result = replaceSection(result, 'REVIEWS', 'BOOKING', reviews);

  let booking = getSection(result, 'BOOKING', 'FOOTER');
  booking = renderBooking(booking, data);
  result = replaceSection(result, 'BOOKING', 'FOOTER', booking);

  let footer = getSection(result, 'FOOTER', 'LIGHTBOX');
  footer = renderFooter(footer, data);
  result = replaceSection(result, 'FOOTER', 'LIGHTBOX', footer);

  result = renderStructuredData(result, data);
  result = renderContactLinks(result, data.contact);
  result = renderInteractiveScript(result, data.gallery);
  result = renderCopyCollections(result, data.copy);
  result = renderTokens(result, data);
  if (/\{\{[a-z0-9_.]+\}\}/i.test(result)) {
    throw new Error('Nicht aufgelöste Inhaltsvariable im HTML gefunden.');
  }
  return result;
}

function renderCopyCollections(source, copy) {
  const directItems = languages.flatMap(lang => (copy?.direct_items?.[lang] || []).map(item =>
    `<li class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${rich(item)}</li>`
  )).join('');
  const benefits = languages.flatMap(lang => (copy?.reviews_benefits?.[lang] || []).map(item =>
    `<div class="rw-item lang-${lang}${lang === 'de' ? '' : ' hidden'}"><span class="rw-icon">✓</span><div>${rich(item)}</div></div>`
  )).join('');
  return source
    .replace('{{copy.direct_items_html}}', directItems)
    .replace('{{copy.reviews_benefits_html}}', benefits);
}

function renderTokens(source, data) {
  return source.replace(/\{\{([a-z0-9_.]+)\}\}/gi, (token, pathValue) => {
    const value = pathValue.split('.').reduce((current, key) => current?.[key], data);
    if (value === undefined || value === null) {
      throw new Error(`Inhaltsvariable „${pathValue}“ fehlt.`);
    }
    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(`Inhaltsvariable „${pathValue}“ muss Text oder Zahl sein.`);
    }
    return rich(value);
  });
}

function renderPills(items) {
  return items.map(item => languages.map(lang =>
    `<span class="pill lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(`${item.icon ? `${item.icon} ` : ''}${item[`text_${lang}`] || item.text_de || ''}`)}</span>`
  ).join('\n      ')).join('\n      ');
}

function renderHighlights(items) {
  return items.map(item =>
    `<span class="hi">${esc(item.icon || '')} ${languages.map(lang => `<span class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(item[`text_${lang}`] || item.text_de || '')}</span>`).join('')}</span>`
  ).join('\n      ');
}

function renderAbout(about) {
  return languages.map(lang => String(about[`body_${lang}`] || '').split(/\n\s*\n/).map(paragraph =>
    `        <p class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${rich(paragraph)}</p>`
  ).join('\n')).join('\n') + '\n        ';
}

function renderStats(data) {
  const checkin = esc(data.checkin_time || '16:00');
  const checkout = esc(data.checkout_time || '10:00');
  const deposit = esc(data.kaution || '€ 300');
  return `
          <div class="vstat">
            <div class="vstat-l lang-de">Check-in</div><div class="vstat-l lang-en hidden">Check-in</div><div class="vstat-l lang-uk hidden">Заїзд</div>
            <div class="vstat-v lang-de">ab ${checkin} Uhr</div><div class="vstat-v lang-en hidden">from ${checkin}</div><div class="vstat-v lang-uk hidden">від ${checkin}</div>
          </div>
          <div class="vstat">
            <div class="vstat-l lang-de">Check-out</div><div class="vstat-l lang-en hidden">Check-out</div><div class="vstat-l lang-uk hidden">Виїзд</div>
            <div class="vstat-v lang-de">bis ${checkout} Uhr</div><div class="vstat-v lang-en hidden">by ${checkout}</div><div class="vstat-v lang-uk hidden">до ${checkout}</div>
          </div>
          <div class="vstat">
            <div class="vstat-l lang-de">Kaution</div><div class="vstat-l lang-en hidden">Deposit</div><div class="vstat-l lang-uk hidden">Застава</div>
            <div class="vstat-v">${deposit}</div>
          </div>
          <div class="vstat">
            <div class="vstat-l lang-de">Gäste</div><div class="vstat-l lang-en hidden">Guests</div><div class="vstat-l lang-uk hidden">Гості</div>
            <div class="vstat-v lang-de">bis 8 Personen</div><div class="vstat-v lang-en hidden">up to 8 persons</div><div class="vstat-v lang-uk hidden">до 8 осіб</div>
          </div>
        `;
}

function renderGallery(items) {
  return items.map((item, index) => {
    const src = safeAssetPath(item.src);
    const full = safeAssetPath(item._full || item.src);
    const large = [0, 3, 9, 12, 15].includes(index);
    const sizes = `(max-width:900px) 50vw, ${large ? '66vw' : '33vw'}`;
    const labels = languages.map(lang =>
      `<span class="gi-lbl lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(item[`label_${lang}`] || item.label_de || '')}</span>`
    ).join('');
    const responsive = full !== src ? ` srcset="${attr(src)} 720w, ${attr(full)} 1200w" sizes="${sizes}"` : '';
    return `<button type="button" class="gi gi-${index}" onclick="openLb(${index})" aria-label="${attr(item.alt_de || item.label_de || `Galeriebild ${index + 1}`)}"><img src="${attr(src)}"${responsive} alt="${attr(item.alt_de || item.label_de || '')}" loading="lazy" decoding="async"><span class="gi-ov"></span>${labels}</button>`;
  }).join('\n      ');
}

function renderAmenities(items) {
  return items.map(item => {
    const titles = languages.map(lang => `<div class="acard-title lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(item[`title_${lang}`] || item.title_de || '')}</div>`).join('');
    const lists = languages.map(lang => `<ul class="acard-list lang-${lang}${lang === 'de' ? '' : ' hidden'}">${(item[`items_${lang}`] || []).map(value => `<li>${esc(value)}</li>`).join('')}</ul>`).join('');
    return `<div class="acard fu vis"><div class="acard-icon">${esc(item.icon || '')}</div>${titles}${lists}</div>`;
  }).join('\n      ');
}

function renderPrices(items) {
  return items.map(item => {
    const cls = item.highlight ? ' class="price-high"' : '';
    const periods = languages.map(lang => `<td class="lang-${lang}${lang === 'de' ? '' : ' hidden'}${item.highlight ? ' price-high' : ''}">${esc(item[`period_${lang}`] || item.period_de || '')}</td>`).join('');
    return `<tr>${periods}<td${cls}>${esc(item.price || '')}</td></tr>`;
  }).join('\n              ');
}

function renderNotes(notes) {
  return languages.map(lang => `<span class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${rich(notes?.[lang] || '')}</span>`).join('\n            ');
}

function renderDistances(items) {
  return items.map(item => `<div class="dist-item"><span class="di-icon">${esc(item.icon || '📍')}</span>${languages.map(lang => `<span class="di-name lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(item[`name_${lang}`] || item.name_de || '')}</span>`).join('')}<span class="di-dist">${esc(item.dist || '')}</span></div>`).join('\n          ');
}

function renderReviews(items) {
  if (!items.length) return '';
  return `    <div class="review-grid fu vis" style="margin-bottom:2rem;">\n${items.map(item => {
    const initials = String(item.name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    const text = languages.map(lang => `<p class="rcard-text lang-${lang}${lang === 'de' ? '' : ' hidden'}">„${esc(item[`text_${lang}`] || item.text_de || '')}“</p>`).join('');
    const date = languages.map(lang => `<span class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(item[`date_${lang}`] || item.date_de || '')}</span>`).join('');
    return `      <article class="rcard"><span class="rcard-src">${esc(item.platform || '')}</span><div class="rcard-stars" role="img" aria-label="${Number(item.stars) || 0} von 5 Sternen">${'★'.repeat(Math.max(0, Math.min(5, Number(item.stars) || 0)))}</div>${text}<div class="rcard-author"><span class="rcard-avatar">${esc(initials)}</span><div><div class="rcard-name">${esc(item.name || '')}</div><div class="rcard-meta">${esc(item.origin || '')} · ${date}</div></div></div></article>`;
  }).join('\n')}\n    </div>`;
}

function renderBooking(section, data) {
  const checkin = esc(data.checkin_time || '16:00');
  const checkout = esc(data.checkout_time || '10:00');
  const deposit = esc(data.kaution || '€ 300');
  const email = esc(data.contact.email || '');
  const phone = esc(data.contact.phone || '');
  const mailHref = attr(`mailto:${data.contact.email || ''}`);
  const telHref = attr(`tel:${phoneHref(data.contact.phone || '')}`);
  section = replaceDivInner(section, 'ci-list', `
          <div class="ci"><span class="ci-ic">📧</span><span class="ci-txt"><a href="${mailHref}">${email}</a></span></div>
          <div class="ci"><span class="ci-ic">📞</span><span class="ci-txt"><a href="${telHref}">${phone}</a></span></div>
          <div class="ci"><span class="ci-ic">🔑</span><span class="ci-txt lang-de">Check-in ab ${checkin} · Check-out bis ${checkout}</span><span class="ci-txt lang-en hidden">Check-in from ${checkin} · Check-out by ${checkout}</span><span class="ci-txt lang-uk hidden">Заїзд від ${checkin} · Виїзд до ${checkout}</span></div>
          <div class="ci"><span class="ci-ic">💶</span><span class="ci-txt lang-de">Kaution: ${deposit} (vor Ort zurückgegeben)</span><span class="ci-txt lang-en hidden">Security deposit: ${deposit} (returned on site)</span><span class="ci-txt lang-uk hidden">Застава: ${deposit} (повертається на місці)</span></div>
          <div class="ci"><span class="ci-ic">📍</span><span class="ci-txt lang-de">${esc(data.site?.address_de || '')}</span><span class="ci-txt lang-en hidden">${esc(data.site?.address_en || data.site?.address_de || '')}</span><span class="ci-txt lang-uk hidden">${esc(data.site?.address_uk || data.site?.address_de || '')}</span></div>
        `);
  return section;
}

function renderFooter(section, data) {
  for (const lang of languages) {
    const pattern = new RegExp(`<p class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">[\\s\\S]*?<\\/p>`);
    section = replaceOnce(section, pattern, `<p class="lang-${lang}${lang === 'de' ? '' : ' hidden'}">${esc(data.footer_tagline?.[lang] || '')}</p>`, `Footer ${lang}`);
  }
  return section;
}

function renderStructuredData(source, data) {
  return source.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, () => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: data.site?.name || 'Villa Joka',
      description: data.seo?.schema_description || data.seo?.description || '',
      url: data.site?.canonical_url || '',
      image: (data.gallery || []).slice(0, 6).map(item => `${String(data.site?.canonical_url || '').replace(/\/$/, '')}/${safeAssetPath(item._full || item.src)}`),
      telephone: phoneHref(data.contact.phone || ''),
      email: data.contact.email || '',
      address: { '@type': 'PostalAddress', streetAddress: data.site?.address_de || '', addressLocality: 'Banjole', addressRegion: 'Istrien', addressCountry: 'HR' },
      geo: { '@type': 'GeoCoordinates', latitude: 44.795, longitude: 13.935 },
      numberOfRooms: 3,
      petsAllowed: false
    };
    return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2).replaceAll('<', '\\u003c')}\n</script>`;
  });
}

function renderContactLinks(source, contact) {
  const email = String(contact.email || '').trim();
  const phone = String(contact.phone || '').trim();
  const whatsapp = String(contact.whatsapp || '').replace(/\D/g, '');
  let result = source
    .replace(/mailto:[^"']+/g, `mailto:${attr(email)}`)
    .replace(/tel:[^"']+/g, `tel:${attr(phoneHref(phone))}`)
    .replace(/https:\/\/wa\.me\/\d+/g, `https://wa.me/${whatsapp}`);
  result = result.replaceAll('info@villa-joka.eu', esc(email));
  result = result.replaceAll('+43 650 542 82 29', esc(phone));
  return result;
}

function renderInteractiveScript(source, gallery) {
  const lightboxData = gallery.map(item => ({
    src: safeAssetPath(item._full || item.src),
    de: item.label_de || '',
    en: item.label_en || item.label_de || '',
    uk: item.label_uk || item.label_de || ''
  }));
  let result = source.replace(/var imgs = \[[\s\S]*?\n\];/, `var imgs = ${JSON.stringify(lightboxData, null, 2)};`);
  result = result.replace("var lang = 'de';", "var lang = localStorage.getItem('vjLang') || 'de';");
  result = result.replace(
    '  lang = l;\n}',
    "  lang = l;\n  localStorage.setItem('vjLang', l);\n  var message = document.querySelector('textarea[name=\"nachricht\"]');\n  if (message) message.placeholder = message.getAttribute('data-placeholder-' + l) || '';\n}"
  );
  result = result.replace(
    "document.getElementById('hbg').addEventListener('click', function() {\n  document.getElementById('mobNav').classList.toggle('open');\n});",
    "document.getElementById('hbg').addEventListener('click', function() {\n  var menu = document.getElementById('mobNav');\n  var open = menu.classList.toggle('open');\n  this.setAttribute('aria-expanded', String(open));\n});"
  );
  result = result.replace(
    "function closeMob() { document.getElementById('mobNav').classList.remove('open'); }",
    "function closeMob() { document.getElementById('mobNav').classList.remove('open'); document.getElementById('hbg').setAttribute('aria-expanded', 'false'); }"
  );
  result = result.replace(
    "setTimeout(function() {\n  document.querySelectorAll('.fu').forEach(function(el) { el.classList.add('vis'); });\n}, 800);",
    "setTimeout(function() {\n  document.querySelectorAll('.fu').forEach(function(el) { el.classList.add('vis'); });\n}, 800);\nsetLang(lang);"
  );
  return result;
}

function replaceElementTextByClass(source, tag, classToken, values, prefix, allowHtml) {
  let result = source;
  for (const lang of languages) {
    const re = new RegExp(`(<${tag}[^>]*class="[^"]*\\b${classToken}\\b[^"]*\\blang-${lang}\\b[^"]*"[^>]*>)[\\s\\S]*?(<\\/${tag}>)`);
    const value = values?.[`${prefix}${lang}`] || values?.[`${prefix}de`] || '';
    result = replaceOnce(result, re, `$1${allowHtml ? rich(value) : esc(value)}$2`, `${classToken}.${lang}`);
  }
  return result;
}

function getSection(source, startName, endName) {
  const start = source.indexOf(`<!-- ${startName} -->`);
  const end = source.indexOf(`<!-- ${endName} -->`, start);
  if (start === -1 || end === -1) throw new Error(`Template-Bereich ${startName} → ${endName} fehlt.`);
  return source.slice(start, end);
}

function replaceSection(source, startName, endName, replacement) {
  const start = source.indexOf(`<!-- ${startName} -->`);
  const end = source.indexOf(`<!-- ${endName} -->`, start);
  if (start === -1 || end === -1) throw new Error(`Template-Bereich ${startName} → ${endName} fehlt.`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function replaceBeforeDivClass(source, outerClass, nextClass, replacement) {
  const outer = findOpenTag(source, 'div', outerClass, 0);
  const next = findOpenTag(source, 'div', nextClass, 0, outer.openEnd);
  if (!outer || !next) throw new Error(`Template-Struktur ${outerClass} → ${nextClass} fehlt.`);
  return source.slice(0, outer.openEnd) + '\n' + replacement + source.slice(next.openStart);
}

function replaceDivInner(source, classToken, replacement, occurrence = 0) {
  const found = findOpenTag(source, 'div', classToken, occurrence);
  if (!found) throw new Error(`Template-Container .${classToken} (${occurrence + 1}) fehlt.`);
  const closeStart = findMatchingClose(source, 'div', found.openEnd);
  return source.slice(0, found.openEnd) + '\n' + replacement + '\n' + source.slice(closeStart);
}

function findOpenTag(source, tag, classToken, occurrence = 0, from = 0) {
  const re = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${escapeRegExp(classToken)}\\b[^"]*"[^>]*>`, 'g');
  re.lastIndex = from;
  let match;
  for (let index = 0; index <= occurrence; index++) {
    match = re.exec(source);
    if (!match) return null;
  }
  return { openStart: match.index, openEnd: re.lastIndex };
}

function findMatchingClose(source, tag, from) {
  const re = new RegExp(`<${tag}\\b[^>]*>|<\\/${tag}>`, 'gi');
  re.lastIndex = from;
  let depth = 1;
  let match;
  while ((match = re.exec(source))) {
    if (match[0][1] === '/') depth -= 1;
    else depth += 1;
    if (depth === 0) return match.index;
  }
  throw new Error(`Schließendes </${tag}> fehlt.`);
}

function replaceTagInner(source, tag, replacement, occurrence = 0) {
  const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
  let match;
  for (let index = 0; index <= occurrence; index++) {
    match = re.exec(source);
    if (!match) throw new Error(`<${tag}> (${occurrence + 1}) fehlt.`);
  }
  const close = source.indexOf(`</${tag}>`, re.lastIndex);
  if (close === -1) throw new Error(`</${tag}> fehlt.`);
  return source.slice(0, re.lastIndex) + '\n              ' + replacement + '\n            ' + source.slice(close);
}

function replaceOnce(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Template-Stelle „${label}“ fehlt.`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function safeAssetPath(value) {
  const normalized = String(value || '').replace(/^\/+/, '').replaceAll('\\', '/');
  if (!/^images\/(?:[A-Za-z0-9À-žА-яІіЇїЄєҐґ _.,()&'-]+\/)*[A-Za-z0-9À-žА-яІіЇїЄєҐґ _.,()&'-]+\.(?:jpe?g|png|webp|avif)$/i.test(normalized)) return '';
  if (normalized.includes('..')) return '';
  return normalized;
}

function phoneHref(value) {
  const raw = String(value || '').trim();
  const prefix = raw.startsWith('+') ? '+' : '';
  return prefix + raw.replace(/\D/g, '');
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", middot: '·', ndash: '–', mdash: '—', nbsp: ' ' };
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

function rich(value) {
  const tokens = [];
  let normalized = decodeEntities(value).replace(/<\/?(?:strong|em)\s*>|<br\s*\/?\s*>/gi, tag => {
    const token = `\uE000${tokens.length}\uE001`;
    tokens.push(tag.toLowerCase().replace(/\s+/g, ''));
    return token;
  });
  normalized = esc(normalized);
  return normalized.replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] || '');
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function attr(value) {
  return esc(value).replaceAll('`', '&#96;');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
