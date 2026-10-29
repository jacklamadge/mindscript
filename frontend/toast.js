// toast.js — всплывающие уведомления + замена стандартного alert
(function () {
  let container = null;

  function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // Автоопределение типа по эмодзи/словам в сообщении
  function guessType(msg) {
    if (/❌|Ошибка|ошибка|Не удалось/.test(msg)) return 'error';
    if (/✅|Готово|Скопировано|Скачано|активирован/.test(msg)) return 'success';
    if (/⚠️|Лимит/.test(msg)) return 'warn';
    return 'info';
  }

  function show(message, type, duration) {
    const msg = String(message);
    const t = type || guessType(msg);
    const dur = duration || 3000;

    if (!document.body) {
      console.log('[toast]', msg);
      return;
    }

    const box = ensureContainer();
    const el = document.createElement('div');
    el.className = 'toast toast-' + t;
    el.textContent = msg;
    box.appendChild(el);

    requestAnimationFrame(() => el.classList.add('toast-show'));
    setTimeout(() => {
      el.classList.remove('toast-show');
      el.classList.add('toast-hide');
      setTimeout(() => el.remove(), 300);
    }, dur);
  }

  window.Toast = {
    show: show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d),
    warn: (m, d) => show(m, 'warn', d),
    info: (m, d) => show(m, 'info', d),
  };

  // Заменяем стандартный alert на toast
  // (confirm и prompt остаются нативными — они нужны для логики)
  window.alert = (m) => show(m, guessType(String(m)), 3000);
})();