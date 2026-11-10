#!/usr/bin/env node
/**
 * AVING FIX — data updater
 *
 * us.aving.net 에서 "FIX" 검색 결과를 수집해 data/stories.json 을 다시 만듭니다.
 * - 요청 간격: 1.5초 (서버 부하 방지)
 * - 이미 받은 기사(scripts/raw-fix.json)는 다시 요청하지 않음 → 새 기사만 상세 요청
 * - FIX 기사 본문은 data/body/<id>.json 으로 저장 (사이트 안 기사 페이지용)
 * - 시작 전에 예상 요청 횟수를 출력하고, --yes 가 없으면 확인을 묻습니다.
 *
 * 사용법 (Node 18+ , 의존성 없음)
 *   node scripts/update-fix.mjs          # 요청 횟수 확인 후 진행
 *   node scripts/update-fix.mjs --yes    # 확인 없이 진행
 *   node scripts/update-fix.mjs --build  # 네트워크 없이 raw-fix.json → stories.json 만 재생성
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'scripts', 'raw-fix.json');
const OUT = path.join(ROOT, 'data', 'stories.json');
const BODY_DIR = path.join(ROOT, 'data', 'body');
const exists = f => access(f).then(() => true, () => false);
const BASE = 'https://us.aving.net';
const WORD = 'FIX';
const DELAY = 1500;
const UA = 'Mozilla/5.0 (AVING FIX hub updater)';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = new Set(process.argv.slice(2));
let requests = 0;

async function get(url) {
  if (requests++) await sleep(DELAY);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

const decode = s => s
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/\s+/g, ' ').trim();

/* ---------- list pages ---------- */
function parseList(html) {
  const out = [];
  const block = html.split('id="section-list"')[1] || '';
  for (const li of block.split('<li>').slice(1)) {
    const id = +(li.match(/idxno=(\d+)/) || [])[1];
    if (!id) continue;
    const t = decode((li.match(/<h4 class="titles">([\s\S]*?)<\/h4>/) || [])[1] || '');
    const ems = [...li.matchAll(/<em[^>]*>([\s\S]*?)<\/em>/g)].map(m => decode(m[1]));
    const img = (li.match(/<img src="([^"]+)"/) || [])[1] || '';
    const lead = decode((li.match(/<p class="lead[^"]*">([\s\S]*?)<\/p>/) || [])[1] || '');
    out.push({ id, t, by: ems[0] || '', d: ems[1] || '', img, lead });
  }
  return out;
}

function totalPages(html) {
  const total = +(html.match(/total=(\d+)/) || [])[1] || 0;
  return { total, pages: Math.max(1, Math.ceil(total / 20)) };
}

/* ---------- article page ---------- */
const FIX_RE = /\bFIX\s?(20\d\d)?\b|Future Innovation (?:tech )?e?Xpo\s?(20\d\d)?/gi;

function parseArticle(html) {
  const meta = name => (html.match(new RegExp(`<meta[^>]+(?:property|name)="${name}"[^>]+content="([^"]*)"`)) || [])[1] || '';
  const bodyHtml = (html.match(/id="article-view-content-div"[^>]*>([\s\S]*?)<\/article>/) || [])[1] || '';
  const txt = decode(bodyHtml);
  const m = [...txt.matchAll(FIX_RE)].filter(x => x[0].trim() !== 'fix');
  const yt = [...bodyHtml.matchAll(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/g)].map(x => x[1]);
  return {
    sec: decode(meta('article:section')),
    yt: [...new Set(yt)],
    hits: m.length,
    yrs: [...new Set(m.map(x => x[1] || x[2]).filter(Boolean))],
    ctx: m[0] ? txt.slice(Math.max(0, m[0].index - 80), m[0].index + 80) : '',
    desc: decode(meta('description')).slice(0, 240),
  };
}

/* ---------- article body → blocks (data/body/<id>.json) ---------- */
// 사이트의 기사 페이지가 읽는 형식: { body: [ {t:'p',x}, {t:'h',x}, {t:'img',src,cap}, {t:'yt',id}, {t:'ul',li:[]}, {t:'table',rows:[[]]} ] }
export function parseBody(html) {
  const bodyHtml = (html.match(/id="article-view-content-div"[^>]*>([\s\S]*?)<\/article>/) || [])[1] || '';
  const out = [];
  const re = /<figure[\s\S]*?<\/figure>|<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>|<p[^>]*>[\s\S]*?<\/p>|<ul[^>]*>[\s\S]*?<\/ul>|<ol[^>]*>[\s\S]*?<\/ol>|<table[\s\S]*?<\/table>|<iframe[^>]+>/gi;
  for (const [chunk] of bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '').matchAll(re)) {
    const tag = chunk.slice(1, 3).toLowerCase();
    if (tag === 'fi') {
      const src = (chunk.match(/<img[^>]+(?:data-src|src)="([^"]+)"/) || [])[1];
      if (src) out.push({ t: 'img', src: new URL(src, BASE).href, cap: decode((chunk.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/) || [])[1] || '') });
    } else if (tag === 'if') {
      const id = (chunk.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/) || [])[1];
      if (id) out.push({ t: 'yt', id });
    } else if (/^h\d/.test(tag)) {
      const x = decode(chunk); if (x) out.push({ t: 'h', x });
    } else if (tag === 'ul' || tag === 'ol') {
      const li = [...chunk.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => decode(m[1])).filter(Boolean);
      if (li.length) out.push({ t: 'ul', li });
    } else if (tag === 'ta') {
      const rows = [...chunk.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(r => [...r[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c => decode(c[1])));
      if (rows.length) out.push({ t: 'table', rows });
    } else {
      const x = decode(chunk);
      if (!x) continue;
      const strong = decode([...chunk.matchAll(/<(strong|b)>([\s\S]*?)<\/\1>/gi)].map(m => m[2]).join(' '));
      out.push(strong && strong === x && x.length < 160 ? { t: 'h', x } : { t: 'p', x });
    }
  }
  return out;
}

/* ---------- build stories.json ---------- */
export function build(raw) {
  // FIX 관련 기사 판별:
  //  - 제목/리드에 FIX 또는 Future Innovation 이 있거나
  //  - 본문에 FIX 언급이 3회 이상(행사 참가·수상 기사)이거나
  //  - "part of the Future Innovation…" 처럼 FIX 내 행사임을 밝힌 경우
  //  (본문에 과거 FIX 수상 이력만 한 번 언급한 기사, 'TOP FIX' 같은 제품명은 제외)
  const isFix = r => r.det && (
    /\bFIX\b|Future Innovation/i.test(`${r.t} ${r.lead}`) ||
    r.det.hits >= 3 ||
    (r.det.hits >= 1 && /part of the Future Innovation/i.test(r.det.ctx || ''))
  );
  const items = raw
    .filter(isFix)
    .map(r => {
      const text = `${r.t} ${r.lead}`;
      const tYear = (r.t.match(/FIX\s?(20\d\d)/i) || [])[1];
      const dYear = +r.d.slice(0, 4);
      const yrs = (r.det.yrs || []).map(Number);
      const y = +(tYear || (yrs.includes(dYear) ? dYear : yrs.sort((a, b) => Math.abs(a - dYear) - Math.abs(b - dYear))[0]) || dYear);
      const tags = [];
      if (/best of fix|global media award/i.test(text)) tags.push('awards');
      if (/interview/i.test(r.t)) tags.push('interview');
      return {
        id: r.id, t: r.t, d: r.d.replace(/\./g, '-'), by: r.by, img: r.img,
        lead: (r.lead || r.det.desc || '').slice(0, 240),
        sec: r.det.sec, y, tags, yt: r.det.yt?.[0] || '',
      };
    })
    .sort((a, b) => (a.d < b.d ? 1 : -1));

  const years = [...new Set(items.map(s => s.y))].sort((a, b) => b - a);
  const now = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace('T', ' ');
  return {
    meta: {
      updated: `${now} KST`,
      total: items.length,
      videos: items.filter(s => s.yt).length,
      editions: years.map(y => ({ y, n: items.filter(s => s.y === y).length, v: items.filter(s => s.y === y && s.yt).length })),
    },
    items,
  };
}

/* ---------- main ---------- */
async function main() {
  let raw = [];
  try { raw = JSON.parse(await readFile(RAW, 'utf8')); } catch { /* first run */ }
  const known = new Map(raw.map(r => [r.id, r]));

  if (!args.has('--build')) {
    const listUrl = p => `${BASE}/news/articleList.html?page=${p}&sc_area=A&view_type=sm&sc_word=${WORD}`;
    const first = await get(listUrl(1));
    const { total, pages } = totalPages(first);
    const list = parseList(first);
    // 새 기사 수는 목록을 다 받아야 정확하지만, 최대치를 먼저 알려줍니다.
    const maxNew = Math.max(0, total - known.size);
    console.log(`\n"${WORD}" 검색 결과 ${total}건 / 목록 ${pages}페이지`);
    console.log(`예상 요청: 목록 ${pages}회(1회 완료) + 상세 최대 ${maxNew}회 · 간격 ${DELAY / 1000}초`);
    console.log(`예상 소요: 약 ${Math.ceil(((pages - 1) + maxNew) * DELAY / 60000)}분\n`);
    if (!args.has('--yes')) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const ans = (await rl.question('진행할까요? (y/N) ')).trim().toLowerCase();
      rl.close();
      if (ans !== 'y') return console.log('취소했습니다.');
    }
    for (let p = 2; p <= pages; p++) {
      list.push(...parseList(await get(listUrl(p))));
      process.stdout.write(`\r목록 ${p}/${pages}`);
    }
    const fresh = list.filter(x => !known.get(x.id)?.det);
    console.log(`\n새로 상세 요청할 기사: ${fresh.length}건`);
    let i = 0;
    await mkdir(BODY_DIR, { recursive: true });
    for (const x of fresh) {
      try {
        const html = await get(`${BASE}/news/articleView.html?idxno=${x.id}`);
        x.det = parseArticle(html);
        // 본문은 일단 저장해 두고, FIX 기사가 아니면 아래에서 사이트가 읽지 않음
        await writeFile(path.join(BODY_DIR, `${x.id}.json`), JSON.stringify({ body: parseBody(html) }));
      } catch (e) { console.warn(`\n실패 ${x.id}: ${e.message}`); }
      known.set(x.id, { ...known.get(x.id), ...x });
      process.stdout.write(`\r상세 ${++i}/${fresh.length}`);
    }
    for (const x of list) if (known.has(x.id)) Object.assign(known.get(x.id), { t: x.t, lead: x.lead, img: x.img });
    raw = [...known.values()].sort((a, b) => b.id - a.id);
    await writeFile(RAW, JSON.stringify(raw, null, 1));

    // 이전에 받았지만 본문 파일이 없는 FIX 기사 → 본문만 추가 요청
    const missing = [];
    for (const s of build(raw).items) if (!(await exists(path.join(BODY_DIR, `${s.id}.json`)))) missing.push(s.id);
    if (missing.length) console.log(`\n본문 파일이 없는 FIX 기사 ${missing.length}건 추가 요청`);
    let j = 0;
    for (const id of missing) {
      try {
        const html = await get(`${BASE}/news/articleView.html?idxno=${id}`);
        await writeFile(path.join(BODY_DIR, `${id}.json`), JSON.stringify({ body: parseBody(html) }));
      } catch (e) { console.warn(`\n실패 ${id}: ${e.message}`); }
      process.stdout.write(`\r본문 ${++j}/${missing.length}`);
    }
    console.log(`\n총 요청 ${requests}회`);
  }

  const db = build(raw);
  await writeFile(OUT, JSON.stringify(db));
  console.log(`data/stories.json 저장: FIX 기사 ${db.meta.total}건, 영상 ${db.meta.videos}건, 에디션 ${db.meta.editions.map(e => e.y).join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(e => { console.error(e); process.exit(1); });
}
