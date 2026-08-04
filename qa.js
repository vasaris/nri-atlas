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
eval('var VTT=' + js.match(/const VTT=(\{[\s\S]*?\});/)[1]);
eval('var VTT_NONE=' + js.match(/const VTT_NONE=(new Set\(\[[\s\S]*?\]\));/)[1]);
eval(cut('const LOC_OFF', 'function openLocs').replace(/const /g, 'var '));
eval('var PRESET_TAG=' + js.match(/const PRESET_TAG=(\{[^}]+\});/)[1]);
eval('var AUTHOR_PICKS=' + js.match(/const AUTHOR_PICKS=(new Set\(\[[\s\S]*?\]\));/)[1]);
eval('var GSEARCH=' + js.match(/const GSEARCH=(new Set\(\[[\s\S]*?\]\));/)[1]);

const names = new Set(DATA.map(d => d.n));
check(DATA.length >= 140, 'систем не меньше 140', DATA.length);
const dup = DATA.map(d => d.n).filter((n, i, a) => a.indexOf(n) !== i);
check(dup.length === 0, 'нет дублей имён', dup);
const tld = DATA.filter(d => d.n.includes('~')).map(d => d.n);
check(tld.length === 0, 'в именах нет «~» (разделитель cmp-пермалинка)', tld);

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
const vttOrph = Object.keys(VTT).filter(n => !names.has(n));
check(vttOrph.length === 0, 'VTT без сирот', vttOrph);
const vttBad = Object.entries(VTT).filter(([n, v]) => !Array.isArray(v) || v.length !== 5 ||
  ![0, 1, 2].includes(v[0]) || v.slice(1).some(x => ![0, 1, 2].includes(x)) ||
  v.reduce((a, b) => a + b, 0) === 0).map(([n]) => n);
check(vttBad.length === 0, 'VTT: форма значений корректна', vttBad);
const vnOrph = [...VTT_NONE].filter(n => !names.has(n));
check(vnOrph.length === 0, 'VTT_NONE без сирот', vnOrph);
const metaN = (html.match(/справочник по (\d+) настольным/)||[])[1];
const ogN = (html.match(/content="(\d+) систем, честные вердикты/)||[])[1];
check(metaN === String(DATA.length) && ogN === String(DATA.length), 'счётчики в meta и og = ' + DATA.length, metaN + '/' + ogN);
const vnClash = [...VTT_NONE].filter(n => VTT[n]);
check(vnClash.length === 0, 'VTT и VTT_NONE не пересекаются', vnClash);
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

// 8b. wz-пермалинк: кодек обратим и отбрасывает мусор
let rtBad = 0;
for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (const md of moods)
  for (let d = 0; d < 3; d++) for (let e = 0; e < 2; e++) {
    const dec = wizDec(wizEnc([a, b, md, d, e]));
    if (!dec || dec[0] !== a || dec[1] !== b || dec[3] !== d || dec[4] !== e ||
        dec[2].join('') !== [...md].sort().join('')) rtBad++;
  }
check(rtBad === 0, 'wz-пермалинк: кодек обратим на всех 540 комбо', rtBad);
const junk = ['', '1-2-3', '9-0-0-0-0', '0-0-44-0-0', '0-0-012-0-0', '0-0--0-0', 'a-b-c-d-e', '0-0-0-0-2'];
check(junk.every(j => wizDec(j) === null), 'wz-пермалинк: мусор отклоняется', junk.filter(j => wizDec(j) !== null));

// 9. Каждая строка полна
const broken = DATA.filter(d => !d.n || !d.e || !d.g || !d.note.includes('||') || d.sim.length < 2 || d.tags.length < 1);
check(broken.length === 0, 'все строки полны (движок, жанр, вердикт, связи, теги)', broken.map(d => d.n));


// 10. Дубли ключей в плоских JS-картах (регресс Draw Steel)
const litOf = (re) => (js.match(re) || ['', ''])[1];
const flatLits = {
  DICE_OVR: litOf(/const DICE_OVR=(\{[\s\S]*?\});/),
  VTT: litOf(/const VTT=(\{[\s\S]*?\});/),
  VTT_NOTE: litOf(/const VTT_NOTE=(\{[\s\S]*?\});/),
  PRESET_TAG: litOf(/const PRESET_TAG=(\{[^}]+\});/),
  OFFICIAL: litOf(/const OFFICIAL=(\{[\s\S]*?\});/)
};
let mapDups = [];
Object.entries(flatLits).forEach(([nm, lit]) => {
  const k = [...lit.matchAll(/"((?:[^"\\]|\\.)+)"\s*:/g)].map(x => x[1]);
  k.filter((x, i) => k.indexOf(x) !== i).forEach(x => mapDups.push(nm + ':' + x));
});
check(mapDups.length === 0, 'в JS-картах нет дублей ключей', mapDups);

// 11. Оценки: ровно десять целых осей 0-10
const badScores = DATA.filter(d => Object.keys(d.s).length !== AX.length ||
  !AX.every(a => Number.isInteger(d.s[a.k]) && d.s[a.k] >= 0 && d.s[a.k] <= 10)).map(d => d.n);
check(badScores.length === 0, 'оценки: десять целых осей 0-10 у каждой строки', badScores);

// 12. VTT_NOTE без сирот
eval('var VTT_NOTE=' + js.match(/const VTT_NOTE=(\{[\s\S]*?\});/)[1]);
const noteOrph = Object.keys(VTT_NOTE).filter(n => !names.has(n));
check(noteOrph.length === 0, 'VTT_NOTE без сирот', noteOrph);

// 13. Паритет JSON <-> HTML: html - эталон, data.json обязан совпадать
eval(cut('function diceCat', '/* Выбор автора'));
const J = JSON.parse(fs.readFileSync('nri-atlas-data.json', 'utf8'));
const jBy = new Map(J.systems.map(s => [s.name, s]));
const onlyH = DATA.filter(d => !jBy.has(d.n)).map(d => d.n);
const onlyJ = J.systems.filter(s => !names.has(s.name)).map(s => s.name);
check(!onlyH.length && !onlyJ.length && J.systems.length === DATA.length,
  'паритет: состав строк совпадает с data.json', { onlyH, onlyJ });
const vc = v => v === true ? 1 : v === false ? 0 : v === 'official' ? 2 : v === 'community' ? 1 : v === 'none' ? 0 : NaN;
let par = [];
DATA.forEach(d => {
  const s = jBy.get(d.n); if (!s) return;
  if (s.year !== d.y) par.push(d.n + ':year');
  if (s.russian_edition !== d.ru) par.push(d.n + ':ru');
  if (s.engine !== d.e) par.push(d.n + ':engine');
  if ((s.difficulty || null) !== d.d) par.push(d.n + ':difficulty');
  const tier = FREE.has(d.n) ? 'full' : FREE_QS.has(d.n) ? 'quickstart' : null;
  if ((s.free || null) !== tier) par.push(d.n + ':free');
  if (s.dice !== diceCat(d)) par.push(d.n + ':dice');
  const hv = VTT[d.n], jv = s.vtt || null;
  const jArr = jv ? [vc(jv.foundry), vc(jv.roll20), vc(jv.alchemy), vc(jv.fantasy_grounds), vc(jv.demiplane)] : null;
  if (hv) { if (!jArr || jArr.join() !== hv.join()) par.push(d.n + ':vtt'); }
  else if (VTT_NONE.has(d.n)) { if (jArr && jArr.some(x => x)) par.push(d.n + ':vtt-none'); }
});
check(par.length === 0, 'паритет JSON <-> HTML: год, RU, движок, сложность, free, кубы, VTT', par.slice(0, 15));

console.log(fails === 0 ? '\nБАТАРЕЯ ЗЕЛЁНАЯ' : '\nПРОВАЛОВ: ' + fails);
process.exit(fails === 0 ? 0 : 1);
