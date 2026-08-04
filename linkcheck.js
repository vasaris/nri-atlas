// Линк-чекер локализаций и официальных ссылок НРИ-Атласа.
// Запуск: node linkcheck.js. Падает (код 1) только на мёртвых ссылках (сеть/404/410);
// 403/429/5xx считает предупреждением — магазины часто отбивают ботов, это не смерть ссылки.
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
const cut = (f, t) => js.slice(js.indexOf(f), js.indexOf(t));
eval(cut('const LOC_OFF', 'function openLocs').replace(/const /g, 'var '));
eval('var OFFICIAL=' + js.match(/const OFFICIAL=(\{[\s\S]*?\});/)[1]);

const targets = new Map();
LOC_OFF.forEach(l => { if (l.u) targets.set(l.u, 'локализация: ' + l.n); });
Object.entries(OFFICIAL).forEach(([n, u]) => { if (!targets.has(u)) targets.set(u, 'офиц. сайт: ' + n); });

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
async function probe(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: ctl.signal });
    clearTimeout(timer);
    if (r.status === 404 || r.status === 410) return { s: 'DEAD', code: r.status };
    if (r.ok) return { s: 'OK', code: r.status };
    return { s: 'WARN', code: r.status };
  } catch (e) { clearTimeout(timer); return { s: 'DEAD', code: e.cause?.code || e.name }; }
}

(async () => {
  let dead = 0, warn = 0;
  console.log('Проверяю ' + targets.size + ' ссылок…\n');
  for (const [url, label] of targets) {
    const r = await probe(url);
    if (r.s === 'DEAD') { dead++; console.error('  ✗ МЕРТВА [' + r.code + '] ' + url + '  (' + label + ')'); }
    else if (r.s === 'WARN') { warn++; console.warn('  ~ отбивает [' + r.code + '] ' + url + '  (' + label + ')'); }
    else console.log('  ✓ [' + r.code + '] ' + url);
    await new Promise(res => setTimeout(res, 400)); // не долбим хосты
  }
  console.log('\nИтог: мёртвых ' + dead + ', предупреждений ' + warn + ', всего ' + targets.size);
  process.exit(dead > 0 ? 1 : 0);
})();
