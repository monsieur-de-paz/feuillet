/* Rivage: presentation only. No request, cache, history or document transaction. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const running = new Set();
  let frame = 0, disposed = false, pageKey = '', seenPage = false, settingsPanel = null;
  function animate(target, keyframes, duration = 460, delay = 0) {
    if (!target?.animate || reduced.matches || document.hidden) return;
    const animation = target.animate(keyframes, { duration, delay, easing: 'cubic-bezier(.22,1,.36,1)' });
    running.add(animation);
    animation.finished.catch(() => {}).finally(() => running.delete(animation));
  }
  function cancel() { running.forEach(animation => animation.cancel()); running.clear(); }
  function morphSelectors() {
    const jobs = [];
    for (const parent of [...document.querySelectorAll('.picker-tabs,.settings-workspace>nav,.editor-tabs-scroll')].slice(0, 16)) {
      const active = parent.querySelector('.editor-tab.is-active,button[aria-selected="true"],button[aria-pressed="true"],button.selected');
      if (!active) continue;
      const rect = active.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      jobs.push([parent, { '--morph-x': rect.left - bounds.left + parent.scrollLeft, '--morph-y': rect.top - bounds.top + parent.scrollTop, '--morph-width': rect.width, '--morph-height': rect.height }]);
    }
    // All measurements happen before writes; no per-frame layout loop.
    for (const [parent, values] of jobs) {
      for (const [name, number] of Object.entries(values)) {
        const value = `${Math.round(number * 10) / 10}px`;
        if (parent.style.getPropertyValue(name) !== value) parent.style.setProperty(name, value);
      }
      parent.classList.add('rivage-morph');
    }
  }
  function check() {
    frame = 0;
    if (disposed) return;
    morphSelectors();
    const surface = document.querySelector('.main-panel [data-page-key],#root [data-page-key]');
    const key = surface?.getAttribute('data-page-key') || '';
    if (surface && key !== pageKey) {
      const first = !seenPage; pageKey = key; seenPage = true;
      if (!first) {
        cancel();
        // A transformed page-body would become the containing block of fixed
        // writing tools. Move only document leaves, keeping those tools anchored.
        const leaves = [...surface.querySelectorAll('.page-title-input,.page-description-input,.tiptap>p,.tiptap>h1,.tiptap>h2,.tiptap>h3')].slice(0, 8);
        for (const leaf of leaves) animate(leaf, [{ translate: '0 10px' }, { translate: '0 0' }], 520);
        if (surface.matches('.admin-home')) {
          animate(surface.querySelector('.home-heading'), [{ translate: '0 10px' }, { translate: '0 0' }], 520);
          for (const [index, card] of [...surface.querySelectorAll('.home-page-card')].slice(0, 6).entries())
            animate(card, [{ translate: '0 10px' }, { translate: '0 0' }], 580, index * 22);
        }
      }
    }
    const panel = document.querySelector('.settings-workspace-panel:not([hidden])');
    if (panel !== settingsPanel) {
      if (panel && settingsPanel) animate(panel, [{ translate: '0 7px' }, { translate: '0 0' }], 380);
      settingsPanel = panel;
    }
  }
  function schedule() { if (!frame && !disposed) frame = requestAnimationFrame(check); }
  const observer = new MutationObserver(schedule);
  const resize = new ResizeObserver(schedule);
  function boot() {
    disposed = false;
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-page-key','aria-selected','aria-pressed'] });
    resize.observe(document.documentElement);
    schedule();
  }
  document.addEventListener('click', event => { if (event.target.closest?.('.picker-tabs,.settings-workspace>nav,.editor-tabs-scroll')) schedule(); });
  // The arrival of a page must yield immediately to writing, even when fast.
  for (const name of ['keydown','beforeinput','compositionstart'])
    document.addEventListener(name, event => { if (event.target.closest?.('.tiptap,.page-title-input,.page-description-input')) cancel(); }, true);
  document.addEventListener('scroll', event => { if (event.target.matches?.('.editor-tabs-scroll,.settings-workspace>nav')) schedule(); }, true);
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('pagehide', () => { disposed = true; observer.disconnect(); resize.disconnect(); cancelAnimationFrame(frame); frame = 0; cancel(); });
  window.addEventListener('pageshow', event => { if (event.persisted) boot(); });
  reduced.addEventListener('change', () => { if (reduced.matches) cancel(); schedule(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
