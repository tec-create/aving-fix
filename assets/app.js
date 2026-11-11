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
  const storyLabels = s => [
    s.tags.includes('awards') ? '<span class="story-label">Best of FIX</span>' : '',
    s.tags.includes('interview') ? '<span class="story-label">Interview</span>' : '',
  ].join(' ');

  const kicker = s => `<span class="chip chip--ed">FIX ${s.y}</span>${s.sec ? `<span class="chip">· ${esc(s.sec)}</span>` : ''}`;
  const byline = s => `<p class="meta">${esc(s.by)} · ${fmtDate(s.d)}</p>`;
  const img = s => s.img || (s.yt ? YT_THUMB(s.yt) : '/assets/og.png');

  const card = (s, { lead = false, priority = false } = {}) => `
    <a class="card" href="${ARTICLE(s.id)}">
      <div class="thumb">
        <img src="${esc(img(s))}" alt="" loading="${priority ? 'eager' : 'lazy'}" ${priority ? 'fetchpriority="high"' : ''} decoding="async">
      </div>
      <div class="card__copy"><div class="story-meta">${kicker(s)} ${storyLabels(s)}${s.yt ? '<span class="story-label">Video</span>' : ''}</div>
      <h3>${esc(s.t)}</h3>
      ${lead && s.lead ? `<p class="lead">${esc(s.lead)}</p>` : ''}
      ${byline(s)}</div>
    </a>`;

  const row = s => `
    <a class="row card" href="${ARTICLE(s.id)}">
      <div class="thumb"><img src="${esc(img(s))}" alt="" loading="lazy" decoding="async"></div>
      <div>
        <div>${kicker(s)} ${storyLabels(s)}</div>
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
        <div class="wrap hero__in">
          <h1><span>FIX</span><span class="hero__year">${latestEd.y}</span></h1>
          <p class="hero__name">Future Innovation <span>tech eXpo.</span></p>
          <p class="hero__lede">Every FIX story, on file. Explore the companies, ideas and people shaping mobility, robotics and AI — through AVING’s reporting from Daegu.</p>
          <div class="btns">
            <a class="btn btn--primary" href="#/edition/${latestEd.y}">Explore FIX ${latestEd.y} →</a>
            <a class="btn btn--outline" href="#/awards">Best of FIX →</a>
          </div>
          <p class="archive-note">${meta.total.toLocaleString('en-US')} stories · ${meta.videos} videos · ${meta.editions.at(-1).y}–${latestEd.y}<span>Reporting by AVING NEWS · EXCO, Daegu</span></p>
        </div>
      </section>

      <section class="sec sec--latest" aria-labelledby="latest-title"><div class="wrap">
        <div class="sec__head"><h2 id="latest-title">Latest stories</h2><a class="more" href="#/all">All stories →</a></div>
        ${items.length ? `<div class="latest"><div class="latest__lead">${card(items[0], { lead: true, priority: true }).replace('class="card"', 'class="card card--lead"')}</div><div class="latest__list">${items.slice(1, 5).map(row).join('')}</div></div>` : '<p class="empty">No stories yet.</p>'}
      </div></section>

      ${awards.length ? `
      <section class="sec sec--awards" aria-labelledby="awards-title"><div class="wrap">
        <div class="sec__head"><div><h2 id="awards-title">Best of FIX</h2><p>Global Media Awards · ${awards.length} stories on the companies selected by global media.</p></div><a class="more" href="#/awards">See all picks →</a></div>
        <div class="section-grid awards-grid">${awards.slice(0, 3).map(s => card(s)).join('')}</div>
      </div></section>` : ''}

      ${featured ? `
      <section class="sec"><div class="wrap">
        <div class="sec__head"><h2>From the show floor</h2><a class="more" href="#/videos">All videos →</a></div>
        <div class="feature">
          <div class="feature__media">
            <img src="${YT_THUMB(featured.yt)}" alt="" loading="lazy">
            <button data-yt="${featured.yt}" aria-label="Play video: ${esc(featured.t)}"><span><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l11 7-11 7z" fill="currentColor"/></svg></span></button>
          </div>
          <div>
            <p class="meta">Video · FIX ${featured.y}</p>
            <h3>${esc(featured.t)}</h3>
            ${byline(featured)}
            <div class="btns">
              <a class="btn btn--ghost" href="${ARTICLE(featured.id)}">Read the story →</a>
              <a class="btn btn--ghost" href="https://www.youtube.com/watch?v=${featured.yt}" target="_blank" rel="noopener">Watch on YouTube ↗</a>
            </div>
          </div>
        </div>
      </div></section>` : ''}

      <section class="sec sec--editions"><div class="wrap">
        <div class="sec__head"><h2>Explore the editions</h2></div>
        <div class="eds">${meta.editions.map(e => `
          <a class="ed" href="#/edition/${e.y}">
            <b>FIX ${e.y}</b>
            <span>${e.n} stories${e.v ? ` · ${e.v} videos` : ''}</span>
            <em>Open edition →</em>
          </a>`).join('')}
        </div>
      </div></section>

      <section class="sec sec--more" aria-labelledby="more-title"><div class="wrap">
        <div class="sec__head"><h2 id="more-title">More from FIX ${latestEd.y}</h2><a class="more" href="#/edition/${latestEd.y}">See all ${latestEd.n} →</a></div>
        <div class="section-grid more-grid">${items.filter(s => s.y === latestEd.y).slice(5, 11).map(s => card(s, { lead: true })).join('')}</div>
      </div></section>`;
  }

  /* ---------- list pages ---------- */
  function renderList({ title, desc, items }) {
    const secs = [...new Set(items.map(s => s.sec).filter(Boolean))];
    let sec = '', shown = PAGE;

    view.innerHTML = `
      <section class="page-head"><div class="wrap">
        <h1>${title}</h1>
        <p>${desc}</p>
      </div></section>
      <div class="wrap">
        ${secs.length > 1 ? `<div class="filters" role="toolbar" aria-label="Filter by section">
          <button class="pill is-on" aria-pressed="true" data-sec="">All · ${items.length}</button>
          ${secs.map(x => `<button class="pill" aria-pressed="false" data-sec="${esc(x)}">${esc(x)} · ${items.filter(s => s.sec === x).length}</button>`).join('')}
        </div>` : ''}
        <div class="list-wrap"><div class="editorial-list" id="list"></div><div class="loadmore" id="more"></div></div>
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
        view.querySelectorAll('.pill').forEach(b => { b.classList.toggle('is-on', b === p); b.setAttribute('aria-pressed', String(b === p)); });
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
            ${storyLabels(s)}
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
        <div class="sec__head"><h2>More from FIX ${s.y}</h2><a class="more" href="#/edition/${s.y}">All FIX ${s.y} stories →</a></div>
        <div class="news-rows">${related.map(row).join('')}</div>
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

    view.onclick = null;
    closeSearch();
    closePlayer();
    if (a !== 'article') document.title = SITE_TITLE;

    if (a === 'article' && b) {
      renderArticle(+b);
    } else if (a === 'edition' && b) {
      const y = +b;
      const e = meta.editions.find(x => x.y === y);
      renderList({
        title: `FIX ${y}`,
        desc: e ? `${e.n} stories${e.v ? ` and ${e.v} videos` : ''} from Future Innovation tech eXpo ${y} at EXCO, Daegu.` : 'No stories for this edition yet.',
        items: items.filter(s => s.y === y),
      });
    } else if (a === 'awards') {
      renderList({
        title: 'Global Media Awards',
        desc: 'Global media outlets name their top innovative companies at FIX. Every pick, outlet by outlet.',
        items: items.filter(s => s.tags.includes('awards')),
      });
    } else if (a === 'videos') {
      renderList({
        title: 'FIX on video',
        desc: 'On-site interviews and product walk-throughs from the FIX show floor.',
        items: items.filter(s => s.yt),
      });
    } else if (a === 'all') {
      renderList({ title: 'All FIX stories', desc: `${items.length} stories across ${meta.editions.length} editions, newest first.`, items });
    } else {
      renderHome();
    }
    scrollTo({ top: 0, behavior: 'instant' });
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
  const openSearch = () => {
    if (!DB) return;
    closePlayer();
    $('#search').hidden = false;
    $('#search').showModal();
    $('#q').focus();
    search($('#q').value);
  };
  const closeSearch = () => { $('#search').close(); $('#search').hidden = true; };

  /* ---------- video player ---------- */
  const openPlayer = id => {
    $('#playerFrame').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="YouTube video"></iframe>`;
    $('#player').hidden = false;
    $('#player').showModal();
  };
  const closePlayer = () => { $('#player').close(); $('#playerFrame').innerHTML = ''; $('#player').hidden = true; };

  /* ---------- wiring ---------- */
  $('#openSearch').addEventListener('click', openSearch);
  $('#closeSearch').addEventListener('click', closeSearch);
  $('#search').addEventListener('click', e => { if (e.target.id === 'search') closeSearch(); });
  $('#search').addEventListener('cancel', e => { e.preventDefault(); closeSearch(); });
  $('#q').addEventListener('input', e => search(e.target.value));
  $('#qList').addEventListener('click', e => { if (e.target.closest('a')) closeSearch(); });
  $('#closePlayer').addEventListener('click', closePlayer);
  $('#player').addEventListener('click', e => { if (e.target.id === 'player') closePlayer(); });
  $('#player').addEventListener('cancel', e => { e.preventDefault(); closePlayer(); });
  $('#openMenu').addEventListener('click', e => {
    const d = $('#drawer'); d.hidden = !d.hidden; e.currentTarget.setAttribute('aria-expanded', String(!d.hidden));
  });
  $('#drawer').addEventListener('click', e => { if (e.target.closest('a')) { $('#drawer').hidden = true; $('#openMenu').setAttribute('aria-expanded', 'false'); } });
  document.addEventListener('click', e => { const b = e.target.closest('[data-yt]'); if (b) openPlayer(b.dataset.yt); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeSearch(); closePlayer(); }
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  addEventListener('hashchange', route);

  /* ---------- boot ---------- */
  fetch('/data/stories.json', { cache: 'no-cache' })
    .then(r => { if (!r.ok) throw new Error(`stories.json ${r.status}`); return r.json(); })
    .then(data => {
      DB = data;
      // footer/drawer 요소가 디자인 변경으로 빠져도 사이트가 멈추지 않도록 존재할 때만 채움
      const upd = $('#updated');
      if (upd) upd.textContent = `Updated ${data.meta.updated}`;
      const eds = $('#drawerEditions');
      if (eds) eds.innerHTML = data.meta.editions.map(e => `<a class="pill" href="#/edition/${e.y}">FIX ${e.y}</a>`).join('');
      route();
    })
    .catch(err => {
      console.error('[AVING FIX] boot failed:', err);
      view.innerHTML = '<p class="loading wrap">Could not load stories. Please refresh.</p>';
    });
})();
