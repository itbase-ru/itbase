/* ==========================================================
   IT·База — вся логика
   ========================================================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const MONTHS = ['января','февраля','марта','апреля','мая','июня',
                'июля','августа','сентября','октября','ноября','декабря'];

function formatDate(iso){
  const [y,m,d] = iso.split('-');
  return `${Number(d)} ${MONTHS[Number(m)-1]} ${y}`;
}
function esc(s){
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
const yEl = $('#year');
if (yEl) yEl.textContent = new Date().getFullYear();


/* ==========================================================
   ТЕМА
   ========================================================== */
const THEME_KEY = 'itbase_theme';
function applyTheme(t){
  if (t === 'light') document.documentElement.setAttribute('data-theme','light');
  else document.documentElement.removeAttribute('data-theme');
  const b = $('#themeToggle');
  if (b) b.textContent = (t === 'light') ? '☀' : '☾';
}
(function initTheme(){
  const btn = $('#themeToggle');
  if (!btn) return;
  applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
  btn.addEventListener('click', () => {
    const next = (localStorage.getItem(THEME_KEY) === 'light') ? 'dark' : 'light';
    try { localStorage.setItem(THEME_KEY, next); } catch(e){}
    applyTheme(next);
  });
})();


/* ==========================================================
   ЗАКЛАДКИ
   ========================================================== */
const BM_KEY = 'itbase_bookmarks';
function getBookmarks(){
  try{
    const raw = localStorage.getItem(BM_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }catch(e){ return []; }
}
function setBookmarks(list){
  try { localStorage.setItem(BM_KEY, JSON.stringify(list)); } catch(e){}
}
function isBookmarked(slug){ return getBookmarks().includes(slug); }
function toggleBookmark(slug){
  const list = getBookmarks();
  const i = list.indexOf(slug);
  if (i === -1) list.push(slug); else list.splice(i,1);
  setBookmarks(list);
  return i === -1;
}


/* ==========================================================
   ОБЩИЕ КОМПОНЕНТЫ
   ========================================================== */
function cardHTML(a, isOn){
  return `
    <article class="card">
      <a class="card__cover" href="article.html?a=${encodeURIComponent(a.slug)}">
        <img src="${esc(a.cover)}" alt="${esc(a.title)}" loading="lazy">
      </a>
      <div class="card__body">
        <div class="card__tags">
          ${a.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
        <a href="article.html?a=${encodeURIComponent(a.slug)}">
          <h2 class="card__title">${esc(a.title)}</h2>
        </a>
        <p class="card__excerpt">${esc(a.excerpt)}</p>
        <div class="card__meta">
          <span>${formatDate(a.date)}</span>
          <span class="dot">•</span>
          <span>${a.readTime} мин</span>
          <button class="card__bm${isOn?' is-on':''}" data-slug="${esc(a.slug)}"
                  title="В закладки" aria-label="В закладки">★</button>
        </div>
      </div>
    </article>`;
}
function attachBookmarkButtons(root, cb){
  $$('.card__bm', root).forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const slug = btn.dataset.slug;
      const on = toggleBookmark(slug);
      btn.classList.toggle('is-on', on);
      if (cb) cb(slug, on);
    });
  });
}


/* ==========================================================
   ГЛАВНАЯ
   ========================================================== */
if ($('#grid') && !$('#bmExport')) initHome();

function initHome(){
  const grid = $('#grid');
  const chipsBox = $('#chips');
  const searchEl = $('#search');

  // Если в URL есть ?tag=ИИ — сразу активируем этот тег
  const urlTag = new URLSearchParams(location.search).get('tag');

  let activeTag = urlTag || null;
  let onlyBM = false;
  let query = '';

  const sorted = ARTICLES.slice().sort((a,b) => b.date.localeCompare(a.date));
  const tags = [...new Set(sorted.flatMap(a => a.tags))].sort();

  const chipAll = document.createElement('button');
  chipAll.className = 'chip';
  chipAll.textContent = 'Все';
  chipAll.onclick = () => { activeTag = null; onlyBM = false; updateURL(); render(); };
  chipsBox.appendChild(chipAll);

  tags.forEach(t => {
    const c = document.createElement('button');
    c.className = 'chip';
    c.textContent = t;
    c.onclick = () => {
      activeTag = (activeTag === t) ? null : t;
      updateURL();
      render();
    };
    chipsBox.appendChild(c);
  });

  const bmChip = document.createElement('button');
  bmChip.className = 'chip';
  bmChip.textContent = '★ Закладки';
  bmChip.onclick = () => { onlyBM = !onlyBM; render(); };
  chipsBox.appendChild(bmChip);

  searchEl.addEventListener('input', e => {
    query = e.target.value.trim().toLowerCase();
    render();
  });

  // Меняем URL при выборе тега — чтобы ссылку можно было скопировать
  function updateURL(){
    const url = new URL(location.href);
    if (activeTag) url.searchParams.set('tag', activeTag);
    else url.searchParams.delete('tag');
    history.replaceState(null, '', url);
  }

  function render(){
    $$('.chip', chipsBox).forEach(c => c.classList.remove('is-active'));
    if (!activeTag && !onlyBM) chipAll.classList.add('is-active');
    if (onlyBM) bmChip.classList.add('is-active');
    if (activeTag){
      const f = $$('.chip', chipsBox).find(c => c.textContent === activeTag);
      if (f) f.classList.add('is-active');
    }

    const bm = getBookmarks();
    const list = sorted.filter(a => {
      if (onlyBM && !bm.includes(a.slug)) return false;
      if (activeTag && !a.tags.includes(activeTag)) return false;
      if (query){
        const hay = (a.title + ' ' + a.excerpt + ' ' + a.tags.join(' ')).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (list.length === 0){
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <b>Ничего не найдено</b>
        <span>Попробуй другой запрос или сбрось фильтры</span></div>`;
      return;
    }
    grid.innerHTML = list.map(a => cardHTML(a, bm.includes(a.slug))).join('');
    attachBookmarkButtons(grid, slug => {
      if (onlyBM && !isBookmarked(slug)) render();
    });
  }
  render();
}


/* ==========================================================
   СТАТЬЯ
   ========================================================== */
if ($('#article-view')) initArticle();

function initArticle(){
  const view = $('#article-view');
  const slug = new URLSearchParams(location.search).get('a');
  const article = ARTICLES.find(a => a.slug === slug);

  if (!article){
    document.title = 'Статья не найдена — IT·База';
    view.innerHTML = `<div class="empty" style="padding:100px 0">
      <b>Статья не найдена</b>
      <span>Возможно, ссылка устарела или содержит опечатку</span>
      <p style="margin-top:20px">
        <a href="index.html" style="color:var(--accent)">← Вернуться на главную</a>
      </p></div>`;
    return;
  }

  document.title = article.title + ' — IT·База';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', article.excerpt);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc  = document.querySelector('meta[property="og:description"]');
  const ogImg   = document.querySelector('meta[property="og:image"]');
  const ogUrl   = document.querySelector('meta[property="og:url"]');
  if (ogTitle) ogTitle.setAttribute('content', article.title);
  if (ogDesc)  ogDesc.setAttribute('content', article.excerpt);
  if (ogImg)   ogImg.setAttribute('content', new URL(article.cover, location.href).href);
  if (ogUrl)   ogUrl.setAttribute('content', location.href);

  const on = isBookmarked(article.slug) ? ' is-on' : '';
  const firstTag = article.tags[0];

  view.innerHTML = `
    <nav class="crumbs" aria-label="Хлебные крошки">
      <a href="index.html">Главная</a>
      <span class="sep">/</span>
      <a href="index.html?tag=${encodeURIComponent(firstTag)}">${esc(firstTag)}</a>
      <span class="sep">/</span>
      <span>${esc(article.title)}</span>
    </nav>

    <div class="article-head">
      <div class="card__tags">
        ${article.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      </div>
      <h1>${esc(article.title)}</h1>
      <div class="article-head__meta">
        <span>${formatDate(article.date)}</span>
        <span class="dot">•</span>
        <span>${article.readTime} мин чтения</span>
        <button class="btn-bm${on}" id="bmBtn">★ В закладки</button>
        <div class="share">
          <span class="share__label">Поделиться:</span>
          <button class="share__btn" id="shareTg" title="Telegram">Telegram</button>
          <button class="share__btn" id="shareVk" title="ВКонтакте">VK</button>
          <button class="share__btn" id="shareCopy" title="Скопировать ссылку">Копировать</button>
        </div>
      </div>
    </div>

    <figure class="article-cover">
      <img src="${esc(article.cover)}" alt="${esc(article.title)}">
    </figure>

    <div class="article-layout">
      <article class="article-body" id="article-body">${article.content}</article>
      <aside class="toc" id="toc"></aside>
    </div>

    <section class="wrap" style="padding-bottom:70px">
      <div class="ad-slot ad-slot--inline" id="ad-bottom"></div>
      <h2 style="font-family:Georgia,serif;font-size:22px;margin:24px 0 20px">
        Читай дальше
      </h2>
      <div class="grid" id="related"></div>
    </section>
  `;

  const body = $('#article-body');

  // Таблицы → в скролл-контейнер
  $$('table', body).forEach(table => {
    if (table.parentElement.classList.contains('table-scroll')) return;
    const w = document.createElement('div');
    w.className = 'table-scroll';
    table.parentNode.insertBefore(w, table);
    w.appendChild(table);
  });

  // Подсветка Prism
  if (window.Prism){
    try { Prism.highlightAllUnder(body); } catch(e){}
  }

  // Кнопки «Копировать»
  $$('pre', body).forEach(pre => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Копировать';
    btn.addEventListener('click', async () => {
      const codeEl = pre.querySelector('code');
      const text = (codeEl || pre).innerText;
      try { await navigator.clipboard.writeText(text); }
      catch(e){
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch(_){}
        ta.remove();
      }
      btn.textContent = 'Скопировано';
      btn.classList.add('is-done');
      setTimeout(() => {
        btn.textContent = 'Копировать';
        btn.classList.remove('is-done');
      }, 1600);
    });
    pre.appendChild(btn);
  });

  // Оглавление
  const tocBox = $('#toc');
  const heads = $$('h2, h3', body);
  if (heads.length >= 2){
    heads.forEach((h,i) => { if (!h.id) h.id = 'section-' + i; });
    tocBox.innerHTML = '<div class="toc__title">Содержание</div>' +
      heads.map(h => `<a href="#${h.id}" class="lvl-${h.tagName==='H3'?3:2}">
        ${esc(h.textContent)}</a>`).join('');
    const links = $$('a', tocBox);
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting){
          links.forEach(l => l.classList.toggle(
            'is-active', l.getAttribute('href') === '#' + en.target.id));
        }
      });
    }, { rootMargin: '-80px 0px -70% 0px' });
    heads.forEach(h => spy.observe(h));
  }

  // Кнопка закладки
  const bmBtn = $('#bmBtn');
  bmBtn.addEventListener('click', () => {
    const nowOn = toggleBookmark(article.slug);
    bmBtn.classList.toggle('is-on', nowOn);
    bmBtn.textContent = nowOn ? '★ В закладках' : '★ В закладки';
  });

  // Кнопки «Поделиться»
  const pageUrl = location.href;
  const shareText = article.title;
  const tg = $('#shareTg');
  const vk = $('#shareVk');
  const cp = $('#shareCopy');
  if (tg) tg.addEventListener('click', () => {
    window.open('https://t.me/share/url?url=' + encodeURIComponent(pageUrl) +
                '&text=' + encodeURIComponent(shareText), '_blank');
  });
  if (vk) vk.addEventListener('click', () => {
    window.open('https://vk.com/share.php?url=' + encodeURIComponent(pageUrl) +
                '&title=' + encodeURIComponent(shareText), '_blank');
  });
  if (cp) cp.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(pageUrl); }
    catch(e){
      const ta = document.createElement('textarea');
      ta.value = pageUrl; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch(_){}
      ta.remove();
    }
    const old = cp.textContent;
    cp.textContent = 'Скопировано';
    setTimeout(() => cp.textContent = old, 1500);
  });

  // Похожие — по количеству общих тегов, при равенстве — свежие сверху
  const scored = ARTICLES
    .filter(a => a.slug !== article.slug)
    .map(a => {
      const overlap = a.tags.filter(t => article.tags.includes(t)).length;
      return { article: a, overlap: overlap };
    })
    .filter(x => x.overlap > 0)
    .sort((x, y) => {
      if (y.overlap !== x.overlap) return y.overlap - x.overlap;
      return y.article.date.localeCompare(x.article.date);
    });

  const related = scored.slice(0, 3).map(x => x.article);

  // Если по тегам набралось меньше 3 — добираем самыми свежими
  if (related.length < 3){
    const used = new Set(related.map(a => a.slug));
    used.add(article.slug);
    ARTICLES
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach(a => {
        if (related.length < 3 && !used.has(a.slug)){
          related.push(a);
          used.add(a.slug);
        }
      });
  }

  const relBox = $('#related');
  if (related.length === 0){
    relBox.parentElement.style.display = 'none';
  } else {
    relBox.innerHTML = related.map(a => cardHTML(a, isBookmarked(a.slug))).join('');
    attachBookmarkButtons(relBox);
  }

  // Прогресс
  const bar = $('#progress');
  let ticking = false;
  function upd(){
    const h = document.documentElement;
    const t = h.scrollHeight - h.clientHeight;
    bar.style.width = t > 0 ? (h.scrollTop / t * 100) + '%' : '0%';
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking){ ticking = true; requestAnimationFrame(upd); }
  }, { passive: true });
  upd();
}


/* ==========================================================
   ЗАКЛАДКИ (страница)
   ========================================================== */
if ($('#bmExport')) initBookmarksPage();

function initBookmarksPage(){
  const grid = $('#grid');

  function render(){
    const bm = getBookmarks();
    const list = ARTICLES
      .filter(a => bm.includes(a.slug))
      .sort((a,b) => b.date.localeCompare(a.date));

    if (list.length === 0){
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1;padding:70px 0">
        <b>Пока пусто</b>
        <span>Открой любую статью и нажми «★ В закладки»</span>
        <p style="margin-top:20px">
          <a href="index.html" style="color:var(--accent)">← Ко всем статьям</a>
        </p></div>`;
      return;
    }
    grid.innerHTML = list.map(a => cardHTML(a, true)).join('');
    attachBookmarkButtons(grid, slug => {
      if (!isBookmarked(slug)) render();
    });
  }

  $('#bmExport').addEventListener('click', () => {
    const bm = getBookmarks();
    if (bm.length === 0){ alert('Список пуст.'); return; }
    const data = { version:1, exportedAt:new Date().toISOString(), bookmarks:bm };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `itbase-bookmarks-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  const file = $('#bmFile');
  $('#bmImport').addEventListener('click', () => file.click());
  file.addEventListener('change', e => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed) ? parsed :
                         Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [];
        if (incoming.length === 0){ alert('В файле нет закладок.'); return; }
        const valid = new Set(ARTICLES.map(a => a.slug));
        const merged = new Set(getBookmarks());
        let added = 0;
        incoming.forEach(s => {
          if (valid.has(s) && !merged.has(s)){ merged.add(s); added++; }
        });
        setBookmarks([...merged]);
        render();
        alert(`Импортировано: ${added}`);
      }catch(err){
        alert('Не удалось прочитать файл.');
      }
    };
    reader.readAsText(f);
    file.value = '';
  });

  $('#bmClear').addEventListener('click', () => {
    if (getBookmarks().length === 0) return;
    if (confirm('Удалить все закладки?')){ setBookmarks([]); render(); }
  });

  render();
}


/* ==========================================================
   404 — показать случайные статьи
   ========================================================== */
if ($('#grid404')) init404();

function init404(){
  const grid = $('#grid404');
  const rand = ARTICLES.slice().sort(() => Math.random() - .5).slice(0, 3);
  grid.innerHTML = rand.map(a => cardHTML(a, isBookmarked(a.slug))).join('');
  attachBookmarkButtons(grid);
}
/* ==========================================================
   COOKIE-БАННЕР
   Появляется один раз, при согласии сохраняется в localStorage.
   Показываем только если баннера нет на странице явно — а он
   вставляется кодом ниже во все страницы автоматически.
   ========================================================== */
(function initCookieBanner() {
  const KEY = 'itbase_cookie_ok';
  
  // Уже приняли — не показываем
  try {
    if (localStorage.getItem(KEY) === '1') return;
  } catch (e) { return; } // если localStorage недоступен — не мучаем пользователя
  
  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.innerHTML = `
    <div class="cookie-banner__text">
      Сайт использует cookie для работы закладок и показа рекламы.
      Подробнее — в <a href="privacy.html">Политике конфиденциальности</a>.
    </div>
    <button class="cookie-banner__btn" type="button">Понятно</button>
  `;
  document.body.appendChild(banner);
  
  // Небольшая задержка, чтобы страница успела отрисоваться
  setTimeout(() => banner.classList.add('is-open'), 400);
  
  banner.querySelector('.cookie-banner__btn').addEventListener('click', () => {
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    banner.classList.remove('is-open');
    // Полностью убираем из DOM через 350мс — после анимации
    setTimeout(() => banner.remove(), 350);
  });
})();
