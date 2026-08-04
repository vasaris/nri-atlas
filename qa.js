// QA-батарея НРИ-Атласа. Запуск: node qa.js  (падает с кодом 1 при любом нарушении инварианта)
const fs = require('fs');
let fails = 0;
const ok = (label) => console.log('  ✓', label);
const fail = (label, detail) => { fails++; console.error('  ✗', label, detail !== undefined ? JSON.stringify(detail) : ''); };
const check = (cond, label, detail) => cond ? ok(label) : fail(label, detail);

const html = fs.readFileSync('index.html', 'utf8');
const m = html.match(/<script[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.error('script-блок не найден'); process.exit(1); }
const js = m[1];

// 1. Синтаксис
try { new Function(js); ok('синтаксис JS'); }
catch (e) { fail('синтаксис JS', e.message); process.exit(1); }

// 2. Данные
const cut = (f, t) => js.slice(js.indexOf(f), js.indexOf(t));
eval(cut('const AX=', 'const DIFFN').replace(/const /g, 'var '));
eval(cut('const DIFFN', 'let W={').replace(/const /g, 'var '));
eval(cut('function fam(e)', 'const genSel'));
eval(cut('const DICE_OVR', '/* Официальные').replace(/const /g, 'var '));
eval('var FREE=' + js.match(/const FREE=(new Set\(\[[\s\S]*?\]\));/)[1]);
eval('var FREE_QS=' + js.match(/const FREE_QS=(new Set\(\[[\s\S]*?\]\));/)[1]);
eval(cut('const LOC_OFF', 'function openLocs').replace(/const /g, 'var '));
eval('var PRESET_TAG=' + js.match(/const PRESET_TAG=(\{[^}]+\});/)[1]);
eval('var AUTHOR_PICKS=' + js.match(/const AUTHOR_PICKS=(new Set\(\[[\s\S]*?\]\));/)[1]);
eval('var GSEARCH=' + js.match(/const GSEARCH=(new Set\(\[[\s\S]*?\]\));/)[1]);

const names = new Set(DATA.map(d => d.n));
check(DATA.length >= 140, 'систем не меньше 140', DATA.length);
const dup = DATA.map(d => d.n).filter((n, i, a) => a.indexOf(n) !== i);
check(dup.length === 0, 'нет дублей имён', dup);

// 3. Счётчики в текстах = реальность
const tag = html.match(/(\d+) систем[аы]? · 10 осей/);
check(tag && +tag[1] === DATA.length, 'счётчик в шапке = ' + DATA.length, tag && tag[1]);
const hero = html.match(/по всем (\d+) системам/);
check(hero && +hero[1] === DATA.length, 'счётчик в манифесте = ' + DATA.length, hero && hero[1]);

// 4. Граф «похоже на»
let badSim = [];
DATA.forEach(d => d.sim.forEach(x => { if (!names.has(x)) badSim.push(d.n + '→' + x); }));
check(badSim.length === 0, 'все связи ведут на существующие строки', badSim);

// 5. Локализации: синхронизация в обе стороны
const off = new Set(LOC_OFF.map(l => l.n)), part = new Set(LOC_PART.map(l => l.n));
check(DATA.filter(d => d.ru === 'Да' && !off.has(d.n)).length === 0, 'каждое «Да» имеет строку в таблице',
  DATA.filter(d => d.ru === 'Да' && !off.has(d.n)).map(d => d.n));
check(DATA.filter(d => d.ru === 'Ч' && !part.has(d.n)).length === 0, 'каждое «Ч» имеет пояснение',
  DATA.filter(d => d.ru === 'Ч' && !part.has(d.n)).map(d => d.n));
const orphLoc = LOC_OFF.concat(LOC_PART).filter(l => !names.has(l.n)).map(l => l.n);
check(orphLoc.length === 0, 'в таблицах локализаций нет сирот', orphLoc);

// 6. Кубы, бесплатные, теги пресетов, поисковые ссылки
check(Object.keys(DICE_OVR).filter(n => !names.has(n)).length === 0, 'карта кубов без сирот',
  Object.keys(DICE_OVR).filter(n => !names.has(n)));
check([...FREE].filter(n => !names.has(n)).length === 0, 'FREE без сирот', [...FREE].filter(n => !names.has(n)));
check([...FREE_QS].filter(n => !names.has(n)).length === 0, 'FREE_QS без сирот', [...FREE_QS].filter(n => !names.has(n)));
check([...FREE_QS].filter(n => FREE.has(n)).length === 0, 'ярусы бесплатных не пересекаются',
  [...FREE_QS].filter(n => FREE.has(n)));
check([...GSEARCH].filter(n => !names.has(n)).length === 0, 'поисковые ссылки без сирот',
  [...GSEARCH].filter(n => !names.has(n)));
check([...AUTHOR_PICKS].filter(n => !names.has(n)).length === 0, 'выбор автора без сирот',
  [...AUTHOR_PICKS].filter(n => !names.has(n)));
const allTags = new Set(); DATA.forEach(d => d.tags.forEach(t => allTags.add(t)));
check(Object.values(PRESET_TAG).every(t => allTags.has(t)), 'теги пресетов существуют', PRESET_TAG);

// 7. Подписи осей: без шкальных чисел (регресс фикса)
check(AX.every(a => !/10/.test(a.s)), 'в подписях осей нет «10»', AX.filter(a => /10/.test(a.s)).map(a => a.n));

// 8. Визард: все комбинации дают три результата
eval(cut('function wizResults', 'document.getElementById("wiz")')
  .replace('const [exp,time,mood,focus,lang]=wizA;', 'const [exp,time,mood,focus,lang]=globalThis.wizA;'));
const moods = [[0],[1],[2],[3],[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
let wizErr = 0, combos = 0, not3 = 0;
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (const md of moods)
  for (let d = 0; d < 3; d++) for (let e = 0; e < 2; e++) {
    globalThis.wizA = [a, b, md, d, e]; combos++;
    try { if ((wizResults().match(/class="wres"/g) || []).length < 3) not3++; }
    catch (x) { wizErr++; }
  }
check(wizErr === 0 && not3 === 0, 'визард: ' + combos + ' комбинаций, всегда тройка', { errors: wizErr, not3 });

// 9. Каждая строка полна
const broken = DATA.filter(d => !d.n || !d.e || !d.g || !d.note.includes('||') || d.sim.length < 2 || d.tags.length < 1);
check(broken.length === 0, 'все строки полны (движок, жанр, вердикт, связи, теги)', broken.map(d => d.n));

console.log(fails === 0 ? '\nБАТАРЕЯ ЗЕЛЁНАЯ' : '\nПРОВАЛОВ: ' + fails);
process.exit(fails === 0 ? 0 : 1);
