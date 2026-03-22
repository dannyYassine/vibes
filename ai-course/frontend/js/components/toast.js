const toast = (() => {
  function show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;

    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    el.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

    container.appendChild(el);

    setTimeout(() => {
      el.style.animation = 'toast-out 0.25s ease forwards';
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };
})();
