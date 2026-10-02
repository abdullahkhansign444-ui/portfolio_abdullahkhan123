// Builds the page from resume.json. Edit the JSON, not this file.
const $ = (id) => document.getElementById(id);

// Text is always set via textContent, so nothing in the JSON can inject HTML.
function el(tag, cls, text, attrs) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== '') n.textContent = text;
  if (attrs) Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v));
  return n;
}
const ext = (cls, url, attrs) => el('a', cls, '', { href: url, target: '_blank', rel: 'noopener', ...attrs });

async function init() {
  try {
    const res = await fetch('resume.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const d = await res.json();
    renderHero(d.basics, d.about.metrics, d.skills);
    renderAbout(d.about, d.education || []);
    renderSkills(d.skills);
    renderProjects(d.projects, d.basics.profiles);
    renderContact(d.basics);
    renderFooter(d.basics);
  } catch (err) {
    console.error('Could not load resume.json', err);
    $('hero-name').textContent = 'Could not load resume.json';
    $('hero-summary').textContent = 'Open this page through a web server (for example: python3 -m http.server), not by double-clicking the file.';
  }
}

function renderHero(b, metrics, skills) {
  document.title = `${b.name} | ${b.label}`;
  const logo = $('nav-logo');
  logo.append('[ ', el('span', '', b.handle), '@portfolio ~ ]$');
  $('nav-social').append(...b.profiles.map(p => {
    const a = ext('', p.url, { title: p.network });
    a.textContent = p.short || p.network[0];
    return a;
  }));

  $('hero-pre').textContent = b.label;
  const [first, ...rest] = b.name.split(' ');
  const h1 = $('hero-name');
  h1.append(el('span', 'name-white', first + ' '));
  if (rest.length) h1.append(el('span', 'name-green', rest.join(' ')));

  $('hero-headline').textContent = b.headline;
  $('hero-summary').textContent = b.summary;
  $('hero-badges').append(...skills.flatMap(s => s.items.slice(0, 2)).slice(0, 6).map(t => el('span', 'badge', t)));

  const cta = $('hero-cta');
  const primary = el('a', 'btn-primary', '⚡ View My Work', { href: '#projects' });
  cta.append(primary);
  b.profiles.forEach(p => {
    const net = p.network.toLowerCase();
    const a = ext(net === 'linkedin' ? 'btn-linkedin' : 'btn-github');
    a.textContent = (p.icon || '') + ' ' + p.network;
    a.setAttribute('href', p.url);
    cta.append(a);
  });

  $('hero-stats').append(...metrics.map(m => {
    const d = el('div');
    d.append(el('div', 'stat-val', m.value), el('div', 'stat-label', m.label));
    return d;
  }));
}

function renderAbout(a, education) {
  $('about-text').append(...a.intro.map(t => el('p', '', t)));
  $('education').append(...education.map(e => {
    const d = el('div', 'edu-item');
    d.append(el('b', '', e.area), document.createTextNode(e.institution), el('br'), el('span', '', e.status));
    return d;
  }));
  $('pillars').append(...a.pillars.map(p => {
    const d = el('div', 'pillar');
    d.append(el('div', 'pillar-title', p.title), el('div', 'pillar-desc', p.description));
    return d;
  }));
  $('metrics').append(...a.metrics.map(m => {
    const d = el('div', 'metric');
    d.append(el('div', 'metric-val', m.value), el('div', 'metric-label', m.label));
    return d;
  }));
}

function renderSkills(skills) {
  $('skills-grid').append(...skills.map(s => {
    const card = el('div', 'skill-card');
    const head = el('div', 'skill-card-header');
    head.append(el('div', 'skill-icon', '⚡'), el('h3', '', s.category));
    const tags = el('div', 'skill-tags');
    tags.append(...s.items.map(i => el('span', 'skill-tag', i)));
    card.append(head, tags);
    return card;
  }));
  drawRadar(skills);
}

// Radar polygon is drawn from each category's "level" (0-100) in resume.json.
function drawRadar(skills) {
  const svg = $('radar');
  const NS = 'http://www.w3.org/2000/svg';
  const n = skills.length;
  if (n < 3) { svg.parentElement.hidden = true; return; }
  const cx = 220, cy = 190, R = 110;
  const mk = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  };
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const defs = mk('defs');
  const g = mk('linearGradient', { id: 'rg', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  g.append(mk('stop', { offset: '0%', 'stop-color': '#88cc14', 'stop-opacity': '.4' }),
           mk('stop', { offset: '100%', 'stop-color': '#1db0f5', 'stop-opacity': '.3' }));
  defs.append(g);
  svg.append(defs);

  [1, 0.66, 0.33].forEach(f => svg.append(mk('polygon', {
    points: skills.map((_, i) => pt(i, R * f).join(',')).join(' '),
    fill: 'none', stroke: 'rgba(136,204,20,0.12)'
  })));
  skills.forEach((s, i) => {
    const [x, y] = pt(i, R);
    svg.append(mk('line', { x1: cx, y1: cy, x2: x, y2: y, stroke: 'rgba(136,204,20,0.2)' }));
    const [lx, ly] = pt(i, R + 16);
    const t = mk('text', { x: lx, y: ly + 3, 'text-anchor': lx < cx - 5 ? 'end' : lx > cx + 5 ? 'start' : 'middle' });
    t.textContent = s.category;
    svg.append(t);
  });
  svg.append(mk('polygon', {
    points: skills.map((s, i) => pt(i, R * Math.min(100, Math.max(5, s.level || 50)) / 100).join(',')).join(' '),
    fill: 'url(#rg)', stroke: '#88cc14', 'stroke-width': 1.5, 'stroke-linejoin': 'round'
  }));
}

function renderProjects(projects, profiles) {
  $('social-banner').append(...profiles.map(p => {
    const a = ext('social-banner-card ' + p.network.toLowerCase(), p.url);
    const info = el('div');
    info.append(el('div', 'sbc-title', p.network), el('div', 'sbc-sub', p.blurb || p.username));
    a.append(el('span', 'sbc-icon', p.icon || p.network[0]), info);
    return a;
  }));
  $('projects-list').append(...projects.map((p, i) => {
    const card = el('div', 'project-card');
    const body = el('div');
    const tools = el('div', 'project-tools');
    tools.append(...p.tools.map(t => el('span', 'tool-tag', t)));
    body.append(el('h3', '', p.title), el('div', 'project-outcome', p.outcome), el('p', '', p.description), tools);
    const link = ext('project-link', p.evidence, { 'aria-label': 'Open ' + p.title });
    link.textContent = '↗';
    card.append(el('div', 'project-num', '0' + (i + 1)), body, link);
    return card;
  }));
}

function renderContact(b) {
  const box = $('contact-cards');
  if (b.email) {
    const a = el('a', 'contact-card', '', { href: 'mailto:' + b.email });
    const inner = el('div');
    inner.append(el('div', 'cc-label', 'Email'), el('div', 'cc-sub', b.email));
    a.append(inner);
    box.append(a);
  }
  box.append(...b.profiles.map(p => {
    const a = ext('contact-card', p.url);
    const inner = el('div');
    inner.append(el('div', 'cc-label', p.network), el('div', 'cc-sub', p.username));
    a.append(inner);
    return a;
  }));
}

function renderFooter(b) {
  const text = `${b.handle}@portfolio:~$ echo "© ${new Date().getFullYear()} ${b.name} · BSCS Student${b.location ? ' · ' + b.location : ''}"`;
  const out = $('footer-text');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { out.textContent = text; return; }
  let i = 0;
  (function type() { if (i < text.length) { out.textContent += text[i++]; setTimeout(type, 50); } })();
}

document.addEventListener('DOMContentLoaded', init);
