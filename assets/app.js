/* AVING FIX — Discovery Hub
 * Static, data-driven: everything renders from /data/stories.json.
 * Routes (hash): #/  #/edition/2026  #/awards  #/videos  #/all  #/article/12345
 * Article bodies load on demand from /data/body/<id>.json (fallback: lead + link to AVING USA).
 */
(() => {
  'use strict';

  const ORIGINAL = id => `https://us.aving.net/news/articleView.html?idxno=${id}`;
  const ARTICLE = id => `#/article/${id}`;
  const SITE_TITLE = document.title;
  const YT_THUMB = id => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const PAGE = 24;

  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => (d || '').slice(0, 10).replace(/-/g, '.');
  const view = $('#view');

  let DB = null;

  /* ---------- helpers ---------- */
  const tagBadges = s => [
    s.tags.includes('awards') ? '<span class="badge badge--aw">★ Best of FIX</span>' : '',
    s.tags.includes('interview') ? '<span class="badge badge--iv">Interview</span>' : '',
  ].join(' ');

  const kicker = s => `<span class="chip chip--ed">FIX ${s.y}</span>${s.sec ? `<span class="chip">· ${esc(s.sec)}</span>` : ''}`;
  const byline = s => `<p class="meta">${esc(s.by)} · ${fmtDate(s.d)}</p>`;
  const img = s => s.img || (s.yt ? YT_THUMB(s.yt) : '/assets/og.png');

  const card = (s, { lead = false } = {}) => `
    <a class="card" href="${ARTICLE(s.id)}">
      <div class="thumb">
        <img src="${esc(img(s))}" alt="" loading="lazy" decoding="async">
        ${s.yt ? '<span class="play">▶ Video</span>' : ''}
      </div>
      <div>${kicker(s)} ${tagBadges(s)}</div>
      <h3>${esc(s.t)}</h3>
      ${lead && s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ''}
      ${byline(s)}
    </a>`;

  const row = s => `
    <a class="row card" href="${ARTICLE(s.id)}">
      <div class="thumb"><img src="${esc(img(s))}" alt="" loading="lazy" decoding="async"></div>
      <div>
        <div>${kicker(s)} ${tagBadges(s)}</div>
        <h3>${esc(s.t)}</h3>
        ${byline(s)}
      </div>
    </a>`;

  const setNav = hash => {
    document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === hash));
  };

  /* ---------- home ---------- */
  function renderHome() {
    view.onclick = null;
    const { items, meta } = DB;
    const latestEd = meta.editions[0];
    const vids = items.filter(s => s.yt);
    const awards = items.filter(s => s.tags.includes('awards'));
    // featured video: newest video that is not already in the "Latest" block
    const featured = vids.find(s => !items.slice(0, 6).includes(s)) || vids[0];

    view.innerHTML = `
      <section class="hero">
        <div class="hero__grid" id="dots" aria-hidden="true"></div>
        <div class="hero__shade"></div>
        <div class="wrap hero__in">
          <p class="eyebrow">AVING FIX archive · ${meta.editions.at(-1).y}–${latestEd.y}</p>
          <h1>Every FIX story,<b>on file.</b></h1>
          <p class="hero__lede">Every Future Innovation tech eXpo (FIX) story AVING has covered from EXCO in Daegu — future mobility, robotics, AI, the Best of FIX Global Media Awards and on-site interviews, filed edition by edition.</p>
          <div class="btns">
            <a class="btn btn--primary" href="#/edition/${latestEd.y}">Explore FIX ${latestEd.y} →</a>
            <a class="btn btn--ghost" href="#/awards">Best of FIX →</a>
          </div>
          <div class="stats">
            <div class="stat"><b>${meta.total.toLocaleString('en-US')}</b><span>Stories</span></div>
            <div class="stat"><b>${meta.videos}</b><span>Videos</span></div>
            <div class="stat"><b>${meta.editions.length}</b><span>Editions</span></div>
            <div class="stat"><b>${awards.length}</b><span>Best of FIX picks</span></div>
          </div>
          <p class="hero__hint"><strong>Behind this text</strong>Each square is one story, oldest at the top left. Point at one to read it.</p>
        </div>
      </section>

      ${featured ? `
      <section class="sec"><div class="wrap feature">
        <div class="feature__media">
          <img src="${YT_THUMB(featured.yt)}" alt="">
          <button data-yt="${featured.yt}" aria-label="Play video: ${esc(featured.t)}"><span>▶</span></button>
        </div>
        <div>
          <p class="eyebrow">Featured video · FIX ${featured.y}</p>
          <h3>${esc(featured.t)}</h3>
          ${byline(featured)}
          <div class="btns" style="margin-top:20px">
            <a class="btn btn--ghost" href="${ARTICLE(featured.id)}">Read the story →</a>
            <a class="btn btn--ghost" href="https://www.youtube.com/watch?v=${featured.yt}" target="_blank" rel="noopener">Watch on YouTube ↗</a>
          </div>
        </div>
      </div></section>` : ''}

      <section class="sec"><div class="wrap">
        <div class="sec__head"><div><p class="eyebrow">Latest</p><h2>Fresh from the show floor.</h2></div><a class="more" href="#/all">All stories →</a></div>
        <div class="latest">
          ${card(items[0], { lead: true }).replace('class="card"', 'class="card card--lead"')}
          <div class="rows">${items.slice(1, 6).map(row).join('')}</div>
        </div>
      </div></section>

      ${awards.length ? `
      <section class="sec"><div class="wrap">
        <div class="band">
          <div>
            <p class="eyebrow" style="color:var(--award)">Best of FIX · Global Media Awards</p>
            <div class="band__num">${awards.length}</div>
            <p>stories on the companies global media outlets picked as their top innovators at FIX.</p>
            <a class="more" style="color:var(--award)" href="#/awards">See all picks →</a>
          </div>
          <div class="rows">${awards.slice(0, 4).map(row).join('')}</div>
        </div>
      </div></section>` : ''}

      <section class="sec"><div class="wrap">
        <div class="sec__head"><div><p class="eyebrow">Editions</p><h2>Browse by year.</h2></div></div>
        <div class="eds">${meta.editions.map(e => `
          <a class="ed" href="#/edition/${e.y}">
            <b>FIX ${e.y}</b>
            <span>${e.n} stories${e.v ? ` · ${e.v} videos` : ''}</span>
            <em>Open edition →</em>
          </a>`).join('')}
        </div>
      </div></section>

      ${vids.length > 1 ? `
      <section class="sec" id="video"><div class="wrap">
        <div class="sec__head"><div><p class="eyebrow">Videos</p><h2>Watch it on site.</h2></div><a class="more" href="#/videos">All videos →</a></div>
        <div class="grid grid--4">${vids.filter(s => s !== featured).slice(0, 8).map(s => card(s)).join('')}</div>
      </div></section>` : ''}

      <section class="sec"><div class="wrap">
        <div class="sec__head"><div><p class="eyebrow">FIX ${latestEd.y}</p><h2>More from this edition.</h2></div><a class="more" href="#/edition/${latestEd.y}">See all ${latestEd.n} →</a></div>
        <div class="grid">${items.filter(s => s.y === latestEd.y).slice(6, 12).map(s => card(s, { lead: true })).join('')}</div>
      </div></section>`;

    drawDots();
  }

  /* hero dot grid: one square per story, oldest first */
  function drawDots() {
    const box = $('#dots');
    if (!box) return;
    const ordered = [...DB.items].reverse();
    // size the squares so every story fits the hero exactly once
    const W = box.clientWidth, H = box.clientHeight, N = ordered.length;
    let cell = Math.floor(Math.sqrt((W * H) / N));
    let cols = Math.max(1, Math.floor(W / cell));
    while (cols * Math.floor(H / cell) < N && cell > 12) { cell--; cols = Math.floor(W / cell); }
    const rows = Math.ceil(H / cell);
    box.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    box.style.gridAutoRows = `${cell - 3}px`;
    let html = '';
    for (let i = 0; i < cols * rows; i++) {
      const s = ordered[i];
      html += s
        ? `<i data-i="${DB.items.length - 1 - i}" data-y="${s.y}" class="${s.yt ? 'v ' : ''}${s.tags.includes('awards') ? 'aw' : ''}" style="background-image:url('${esc(img(s))}')"></i>`
        : '<i></i>';
    }
    box.innerHTML = html;

    let tip;
    box.addEventListener('mouseover', e => {
      const i = e.target.dataset?.i;
      if (i == null) return;
      const s = DB.items[+i];
      tip ??= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'tip' }));
      tip.innerHTML = `<small>FIX ${s.y} · ${fmtDate(s.d)}</small>${esc(s.t)}`;
      const r = e.target.getBoundingClientRect();
      tip.style.left = Math.min(r.left + 16, innerWidth - 340) + 'px';
      tip.style.top = r.bottom + 8 + 'px';
      tip.hidden = false;
    });
    box.addEventListener('mouseleave', () => tip && (tip.hidden = true));
    box.addEventListener('click', e => {
      const i = e.target.dataset?.i;
      if (i != null) location.hash = ARTICLE(DB.items[+i].id);
    });
  }

  /* ---------- list pages ---------- */
  function renderList({ title, eyebrow, desc, items, grid = '' }) {
    const secs = [...new Set(items.map(s => s.sec).filter(Boolean))];
    let sec = '', shown = PAGE;

    view.innerHTML = `
      <section class="page-head"><div class="wrap">
        <p class="eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p>${desc}</p>
      </div></section>
      <div class="wrap">
        ${secs.length > 1 ? `<div class="filters" role="toolbar" aria-label="Filter by section">
          <button class="pill is-on" data-sec="">All · ${items.length}</button>
          ${secs.map(x => `<button class="pill" data-sec="${esc(x)}">${esc(x)} · ${items.filter(s => s.sec === x).length}</button>`).join('')}
        </div>` : ''}
        <div class="list-wrap"><div class="grid ${grid}" id="list"></div><div class="loadmore" id="more"></div></div>
      </div>`;

    const draw = () => {
      const list = sec ? items.filter(s => s.sec === sec) : items;
      $('#list').innerHTML = list.length ? list.slice(0, shown).map(s => card(s, { lead: true })).join('') : '<p class="empty">No stories yet.</p>';
      $('#more').innerHTML = list.length > shown ? `<button class="btn btn--ghost">Load more (${list.length - shown})</button>` : '';
    };
    view.onclick = e => {
      const p = e.target.closest('.pill');
      if (p) {
        sec = p.dataset.sec; shown = PAGE;
        view.querySelectorAll('.pill').forEach(b => b.classList.toggle('is-on', b === p));
        draw();
      }
      if (e.target.closest('#more button')) { shown += PAGE; draw(); }
    };
    draw();
  }

  /* ---------- article page ---------- */
  const bodyCache = new Map();
  const loadBody = id => {
    if (!bodyCache.has(id)) {
      bodyCache.set(id, fetch(`/data/body/${id}.json`).then(r => (r.ok ? r.json() : null)).catch(() => null));
    }
    return bodyCache.get(id);
  };

  const block = b => {
    switch (b.t) {
      case 'p': return `<p>${esc(b.x)}</p>`;
      case 'h': return `<h2>${esc(b.x)}</h2>`;
      case 'img': return `<figure><img src="${esc(b.src)}" alt="" loading="lazy" decoding="async">${b.cap ? `<figcaption>${esc(b.cap)}</figcaption>` : ''}</figure>`;
      case 'yt': return `<div class="art__yt"><iframe src="https://www.youtube-nocookie.com/embed/${esc(b.id)}?rel=0" title="YouTube video" loading="lazy" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
      case 'ul': return `<ul>${b.li.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
      case 'table': return `<div class="art__table"><table>${b.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table></div>`;
      default: return '';
    }
  };

  async function renderArticle(id) {
    view.onclick = null;
    const s = DB.items.find(x => x.id === id);
    if (!s) {
      view.innerHTML = `<section class="page-head"><div class="wrap"><h1>Story not found</h1><p><a class="more" href="#/all">Browse all FIX stories →</a></p></div></section>`;
      return;
    }
    document.title = `${s.t} · AVING FIX`;
    const related = DB.items.filter(x => x.y === s.y && x.id !== s.id && (x.sec === s.sec || x.tags.some(t => s.tags.includes(t)))).slice(0, 4);

    view.innerHTML = `
      <article class="art">
        <header class="wrap art__head">
          <nav class="art__crumb" aria-label="Breadcrumb">
            <a href="#/edition/${s.y}">FIX ${s.y}</a>${s.sec ? `<span>/</span><span>${esc(s.sec)}</span>` : ''}
            ${s.tags.includes('awards') ? '<span>/</span><a href="#/awards">Best of FIX</a>' : ''}
          </nav>
          <h1>${esc(s.t)}</h1>
          <div class="art__meta">
            <span>${esc(s.by)} · ${esc((s.d || '').replace(/-/g, '.'))}</span>
            ${tagBadges(s)}
            <a class="art__orig" href="${ORIGINAL(s.id)}" target="_blank" rel="noopener">Original on AVING USA ↗</a>
          </div>
        </header>
        <div class="wrap art__body" id="artBody">
          ${s.img ? `<figure><img src="${esc(s.img)}" alt=""></figure>` : ''}
          ${s.lead ? `<p>${esc(s.lead)}</p>` : ''}
          <p class="meta">Loading story…</p>
        </div>
      </article>
      ${related.length ? `
      <section class="sec"><div class="wrap">
        <div class="sec__head"><div><p class="eyebrow">More from FIX ${s.y}</p><h2>Keep reading.</h2></div><a class="more" href="#/edition/${s.y}">All FIX ${s.y} stories →</a></div>
        <div class="grid grid--4">${related.map(x => card(x)).join('')}</div>
      </div></section>` : ''}`;

    const body = await loadBody(id);
    if (location.hash !== ARTICLE(id)) return; // user navigated away meanwhile
    const el = $('#artBody');
    const credit = `<p class="art__credit">This story was first published by <a href="${ORIGINAL(s.id)}" target="_blank" rel="noopener">AVING USA</a>. © AVING NEWS.</p>`;
    if (body?.body?.length) {
      el.innerHTML = body.body.map(block).join('') + credit;
    } else {
      el.innerHTML = `${s.img ? `<figure><img src="${esc(s.img)}" alt=""></figure>` : ''}<p>${esc(s.lead)}</p>
        <p><a class="btn btn--primary" href="${ORIGINAL(s.id)}" target="_blank" rel="noopener">Read the full story on AVING USA ↗</a></p>`;
    }
  }

  /* ---------- router ---------- */
  function route() {
    if (!DB) return;
    const h = location.hash || '#/';
    const [, a, b] = h.split('/');
    setNav(h);
    const { items, meta } = DB;

    closeSearch();
    if (a !== 'article') document.title = SITE_TITLE;

    if (a === 'article' && b) {
      renderArticle(+b);
    } else if (a === 'edition' && b) {
      const y = +b;
      const e = meta.editions.find(x => x.y === y);
      renderList({
        eyebrow: 'Edition', title: `FIX ${y}`,
        desc: e ? `${e.n} stories${e.v ? ` and ${e.v} videos` : ''} from Future Innovation tech eXpo ${y} at EXCO, Daegu.` : 'No stories for this edition yet.',
        items: items.filter(s => s.y === y),
      });
    } else if (a === 'awards') {
      renderList({
        eyebrow: 'Best of FIX', title: 'Global Media Awards',
        desc: 'Global media outlets name their top innovative companies at FIX. Every pick, outlet by outlet.',
        items: items.filter(s => s.tags.includes('awards')),
      });
    } else if (a === 'videos') {
      renderList({
        eyebrow: 'Videos', title: 'FIX on video',
        desc: 'On-site interviews and product walk-throughs from the FIX show floor.',
        items: items.filter(s => s.yt), grid: 'grid--4',
      });
    } else if (a === 'all') {
      renderList({ eyebrow: 'Archive', title: 'All FIX stories', desc: `${items.length} stories across ${meta.editions.length} editions, newest first.`, items });
    } else {
      renderHome();
    }
    if (a) scrollTo({ top: 0 });
  }

  /* ---------- search ---------- */
  const norm = s => s.toLowerCase().normalize('NFKD');
  function search(q) {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    const list = $('#qList'), meta = $('#qMeta');
    if (!terms.length) { list.innerHTML = ''; meta.textContent = `${DB.items.length} stories indexed`; return; }
    const hits = DB.items
      .map(s => {
        const hay = norm(`${s.t} ${s.lead} ${s.sec} ${s.by}`);
        if (!terms.every(t => hay.includes(t))) return null;
        const score = terms.reduce((n, t) => n + (norm(s.t).includes(t) ? 2 : 1), 0);
        return { s, score };
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score || (x.s.d < y.s.d ? 1 : -1))
      .slice(0, 40);
    const re = new RegExp(`(${terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    meta.textContent = `${hits.length}${hits.length === 40 ? '+' : ''} results`;
    list.innerHTML = hits.map(({ s }) => `
      <li><a href="${ARTICLE(s.id)}">
        <img src="${esc(img(s))}" alt="" loading="lazy">
        <span><b>${esc(s.t).replace(re, '<mark>$1</mark>')}</b><span class="meta">FIX ${s.y} · ${fmtDate(s.d)}</span></span>
      </a></li>`).join('');
  }
  const openSearch = () => { $('#search').hidden = false; $('#q').focus(); search($('#q').value); };
  const closeSearch = () => { $('#search').hidden = true; };

  /* ---------- video player ---------- */
  const openPlayer = id => {
    $('#playerFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube video"></iframe>`;
    $('#player').hidden = false;
  };
  const closePlayer = () => { $('#playerFrame').innerHTML = ''; $('#player').hidden = true; };

  /* ---------- wiring ---------- */
  $('#openSearch').addEventListener('click', openSearch);
  $('#closeSearch').addEventListener('click', closeSearch);
  $('#search').addEventListener('click', e => { if (e.target.id === 'search') closeSearch(); });
  $('#q').addEventListener('input', e => search(e.target.value));
  $('#qList').addEventListener('click', e => { if (e.target.closest('a')) closeSearch(); });
  $('#closePlayer').addEventListener('click', closePlayer);
  $('#player').addEventListener('click', e => { if (e.target.id === 'player') closePlayer(); });
  $('#openMenu').addEventListener('click', e => {
    const d = $('#drawer'); d.hidden = !d.hidden; e.currentTarget.setAttribute('aria-expanded', String(!d.hidden));
  });
  $('#drawer').addEventListener('click', e => { if (e.target.closest('a')) $('#drawer').hidden = true; });
  document.addEventListener('click', e => { const b = e.target.closest('[data-yt]'); if (b) openPlayer(b.dataset.yt); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); closePlayer(); }
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  addEventListener('hashchange', route);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (!location.hash || location.hash === '#/') drawDots(); }, 200); });

  /* ---------- boot ---------- */
  fetch('/data/stories.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(data => {
      DB = data;
      $('#updated').textContent = `Updated ${data.meta.updated}`;
      $('#drawerEditions').innerHTML = data.meta.editions.map(e => `<a class="pill" href="#/edition/${e.y}">FIX ${e.y}</a>`).join('');
      route();
    })
    .catch(() => { view.innerHTML = '<p class="loading wrap">Could not load stories. Please refresh.</p>'; });
})();
