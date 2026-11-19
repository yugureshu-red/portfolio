(function () {
  const root = document.documentElement;
  root.classList.add('js');

  /* ---------- Шапка: граница при скролле ---------- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---------- Появление при скролле ---------- */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- Оглавление кейса: подсветка текущего раздела ---------- */
  const tocLinks = [...document.querySelectorAll('.toc a')];
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(tocLinks.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = [...map.keys()].map((id) => document.getElementById(id)).filter(Boolean);
    const setActive = (id) => tocLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + id));
    const spy = new IntersectionObserver((entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setActive(visible[0].target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Год в подвале ---------- */
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Часы: время в Москве ---------- */
  const clocks = document.querySelectorAll('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
    const tick = () => clocks.forEach((el) => { el.textContent = fmt.format(new Date()); });
    tick();
    setInterval(tick, 30000);
  }
})();
