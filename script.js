const LEAD_ENDPOINT = 'https://lead-relay.leestygpt.workers.dev/lead/39MNLQBHB6';
// Ссылка на Telegram-бота с гайдом «7 ошибок в таргетинге». Пока бота нет, кнопки ведут в личный чат с готовым текстом.
const GUIDE_URL = 'https://t.me/evgenmusl?text=' + encodeURIComponent('Здравствуйте! Хочу гайд «7 ошибок в таргетинге»');

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  $$('.js-guide').forEach(a => { a.href = GUIDE_URL; a.target = '_blank'; a.rel = 'noopener'; });

  // ===== Меню =====
  const burger = $('#burger');
  const menu = $('#menu');
  burger?.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.textContent = open ? 'Закрыть' : 'Меню';
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.textContent = 'Меню';
  }));

  // ===== Плавный якорь =====
  const goTo = id => {
    const target = $(id);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (href.length <= 1 || !$(href)) return;
      e.preventDefault();
      goTo(href);
    });
  });

  // ===== Доска: партия Морфи разыгрывается по мере чтения =====
  // Пол Морфи против герцога Брауншвейгского и графа Изуара, Париж, 1858: 17 ходов, мат.
  const MOVES = 'e2e4 e7e5 g1f3 d7d6 d2d4 c8g4 d4e5 g4f3 d1f3 d6e5 f1c4 g8f6 f3b3 d8e7 b1c3 c7c6 c1g5 b7b5 c3b5 c6b5 c4b5 b8d7 e1c1 a8d8 d1d7 d8d7 h1d1 e7e6 b5d7 f6d7 b3b8 d7b8 d1d8'.split(' ');
  const SAN = ['e4', 'e5', 'Кf3', 'd6', 'd4', 'Сg4', 'dxe5', 'Сxf3', 'Фxf3', 'dxe5', 'Сc4', 'Кf6', 'Фb3', 'Фe7', 'Кc3', 'c6', 'Сg5', 'b5', 'Кxb5', 'cxb5', 'Сxb5+', 'Кbd7', '0-0-0', 'Лd8', 'Лxd7', 'Лxd7', 'Лd1', 'Фe6', 'Сxd7+', 'Кxd7', 'Фb8+', 'Кxb8', 'Лd8#'];
  const FILES = 'abcdefgh';
  const sq = s => [FILES.indexOf(s[0]), 8 - Number(s[1])];
  const NS = 'http://www.w3.org/2000/svg';

  const moveLabel = $('#board-move');
  const mk = (name, attrs) => {
    const el = document.createElementNS(NS, name);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };

  // Строит доску в svg и возвращает функцию «показать позицию после n-го полухода»
  const makeBoard = (svg, onMove) => {
    const squares = {};
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const r = mk('rect', { x: x * 100, y: y * 100, width: 100, height: 100, class: (x + y) % 2 === 0 ? 'sq--l' : 'sq--d' });
        svg.appendChild(r);
        squares[x + ',' + y] = r;
      }
    }

    const back = 'rnbqkbnr';
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      pieces.push({ t: 'b' + back[i], at: [i, 0] }, { t: 'bp', at: [i, 1] }, { t: 'wp', at: [i, 6] }, { t: 'w' + back[i], at: [i, 7] });
    }
    const occ = {};
    pieces.forEach(p => { occ[p.at.join(',')] = p; p.segs = []; p.cap = Infinity; });

    MOVES.forEach((m, i) => {
      const from = sq(m.slice(0, 2));
      const to = sq(m.slice(2, 4));
      const mover = occ[from.join(',')];
      const taken = occ[to.join(',')];
      if (taken) taken.cap = i;
      delete occ[from.join(',')];
      occ[to.join(',')] = mover;
      mover.segs.push({ i, to });
      if (mover.t[1] === 'k' && Math.abs(to[0] - from[0]) === 2) {
        const rf = to[0] < from[0] ? 0 : 7;
        const rt = to[0] < from[0] ? to[0] + 1 : to[0] - 1;
        const rook = occ[rf + ',' + to[1]];
        delete occ[rf + ',' + to[1]];
        occ[rt + ',' + to[1]] = rook;
        rook.segs.push({ i, to: [rt, to[1]] });
      }
    });

    const layer = mk('g', {});
    svg.appendChild(layer);
    pieces.forEach(p => {
      const g = mk('g', { class: 'piece' });
      g.appendChild(mk('use', { href: '#' + p.t, width: 100, height: 100 }));
      layer.appendChild(g);
      p.el = g;
    });

    let shown = -1;
    return n => {
      n = clamp(Math.round(n), 0, MOVES.length);
      if (n === shown) return;
      shown = n;
      pieces.forEach(p => {
        let pos = p.at;
        p.segs.forEach(s => { if (s.i < n) pos = s.to; });
        p.el.style.transform = `translate(${pos[0] * 100}px, ${pos[1] * 100}px)`;
        p.el.style.opacity = p.cap < n ? '0' : '1';
      });
      Object.values(squares).forEach(r => r.classList.remove('hl'));
      if (n > 0) {
        const m = MOVES[n - 1];
        squares[sq(m.slice(0, 2)).join(',')].classList.add('hl');
        squares[sq(m.slice(2, 4)).join(',')].classList.add('hl');
      }
      if (onMove) onMove(n);
    };
  };

  const moveText = n => {
    if (n === 0) return 'Начальная позиция';
    const no = Math.ceil(n / 2);
    return (n % 2 ? no + '. ' : no + '… ') + SAN[n - 1] + (n === MOVES.length ? ', мат' : '');
  };

  let setBoard = () => {};
  const mainSvg = $('#board');
  if (mainSvg) {
    setBoard = makeBoard(mainSvg, n => { if (moveLabel) moveLabel.textContent = moveText(n); });
    setBoard(0);
  }
  // на телефоне доска не липнет к экрану: у каждого этапа своя позиция
  $$('.board--inline').forEach(svg => makeBoard(svg)(Number(svg.dataset.n)));

  // Какой ход показывать: по положению якорей на странице (середина экрана)
  const anchorEls = [
    { el: $('#top'), t: 0 },
    { el: $('#price'), t: 8 },
    ...$$('.step').map(el => ({ el, t: Number(el.dataset.anchor) })),
  ].filter(a => a.el);

  const steps = $$('.step');
  const slideEls = $$('[data-slide]');
  const slides = $$('.slide');
  const photoCap = $('#photo-cap');
  const CAPS = ['Партия в шахматном баре', 'Партия в поезде с проводником', 'Сертификат Skillbox: Авитолог'];
  let slideNow = 0;

  const onScroll = () => {
    const vh = window.innerHeight;
    const probe = window.scrollY + vh * 0.5;
    const pts = anchorEls.map(a => {
      const r = a.el.getBoundingClientRect();
      return { y: r.top + window.scrollY + r.height / 2, t: a.t };
    });
    let t = pts[0].t;
    if (probe >= pts[pts.length - 1].y) t = pts[pts.length - 1].t;
    else if (probe > pts[0].y) {
      for (let i = 0; i < pts.length - 1; i++) {
        if (probe >= pts[i].y && probe <= pts[i + 1].y) {
          const k = (probe - pts[i].y) / (pts[i + 1].y - pts[i].y);
          t = pts[i].t + (pts[i + 1].t - pts[i].t) * k;
          break;
        }
      }
    }
    setBoard(t);

    // Этап работы, который читается сейчас
    let best = null;
    let bestD = Infinity;
    steps.forEach(s => {
      const r = s.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - vh * 0.55);
      if (d < bestD) { bestD = d; best = s; }
    });
    steps.forEach(s => s.classList.toggle('is-active', s === best && bestD < vh * 0.4));

    // Фото слева меняется вместе с текстом
    let idx = 0;
    slideEls.forEach(el => {
      if (el.getBoundingClientRect().top < vh * 0.55) idx = Number(el.dataset.slide);
    });
    if (idx !== slideNow && slides.length) {
      slideNow = idx;
      slides.forEach(s => s.classList.toggle('is-on', Number(s.dataset.i) === idx));
      if (photoCap) photoCap.textContent = CAPS[idx];
    }
  };
  let ticking = false;
  const req = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; onScroll(); });
  };
  window.addEventListener('scroll', req, { passive: true });
  window.addEventListener('resize', req);
  window.addEventListener('load', req);
  onScroll();

  // ===== Цены: отметил канал, увидел итог =====
  const calc = $('#calc');
  const boxes = $$('.item__box');
  const sumMain = $('#sum-main');
  const sumTest = $('#sum-test');
  const sumBtn = $('#sum-btn');
  const commentEl = $('#f-comment');
  const fmt = n => n.toLocaleString('ru-RU').replace(/\s/g, ' ') + ' ₽';
  let autoComment = '';

  const renderSum = () => {
    const on = boxes.filter(b => b.checked);
    if (!on.length) {
      sumMain.textContent = 'Отметьте канал, чтобы увидеть итог';
      sumTest.textContent = '';
      sumBtn.hidden = true;
      if (commentEl && commentEl.value === autoComment) commentEl.value = '';
      autoComment = '';
      return;
    }
    const names = on.map(b => b.value);
    const total = on.reduce((s, b) => s + Number(b.dataset.price), 0);
    const test = on.length * 20000;
    sumMain.textContent = names.join(', ') + ': ' + fmt(total) + ' в месяц';
    sumTest.textContent = 'Первый месяц тестовый: ' + fmt(test) + ' вместо ' + fmt(total) + '.';
    sumBtn.hidden = false;
    const text = 'Интересует: ' + names.join(', ') + '. Итого по прайсу ' + fmt(total) + ' в месяц, тестовый месяц ' + fmt(test) + '.';
    if (commentEl && (commentEl.value.trim() === '' || commentEl.value === autoComment)) {
      commentEl.value = text;
      autoComment = text;
    }
  };
  boxes.forEach(b => b.addEventListener('change', renderSum));
  calc?.addEventListener('submit', e => e.preventDefault());

  // ===== Форма -> Cloudflare Worker -> Telegram =====
  const form = $('#leadForm');
  const status = $('#form-status');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const orig = btn.textContent;
    const payload = {};
    new FormData(form).forEach((v, k) => { payload[k] = String(v).trim(); });
    if (payload._gotcha) return;
    if (!form.elements.consent?.checked) {
      status.textContent = 'Отметьте согласие на обработку персональных данных.';
      return;
    }
    delete payload.consent;
    if (!payload.name || !payload.contact) {
      status.textContent = 'Укажите имя и телефон или Telegram.';
      return;
    }
    status.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Отправляю...';
    try {
      const resp = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      status.textContent = 'Заявка отправлена. Отвечу в ближайшее время.';
      form.reset();
      autoComment = '';
    } catch (err) {
      console.error(err);
      status.textContent = 'Не отправилось. Напишите в Telegram: @evgenmusl.';
    } finally {
      setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2500);
    }
  });

  // ===== Появление частей секций =====
  const targets = $$([
    '.hero__body > *', '.hero__who', '.price .head', '.body-lead', '.group', '.item', '.sum',
    '.how .head', '.fit .head', '.fit__list li', '.story__item', '.guide .head', '.guide__col > *', '.cases__h', '.cases__lead', '.ledger tbody tr', '.proof figure', '.cases__note',
    '.about .head', '.letter > *', '.faq .head', '.facts', '.qa__item', '.faq__end',
    '.contact__h', '.contact__col form', '.contact__links li',
  ].join(','));
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(el => {
      const sibs = [...el.parentElement.children];
      el.style.setProperty('--d', String(Math.min(sibs.indexOf(el), 5)));
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
