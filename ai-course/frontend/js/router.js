// Hash-based router: #/dashboard, #/lesson/section/lesson
const router = (() => {
  const routes = {};
  let currentRoute = null;

  function on(path, handler) {
    routes[path] = handler;
  }

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function resolve() {
    const hash = window.location.hash.slice(1) || '/dashboard';
    const parts = hash.split('/').filter(Boolean);

    // Try exact match first
    if (routes[hash]) {
      currentRoute = hash;
      routes[hash]({});
      return;
    }

    // Pattern match: /lesson/:section/:lesson
    if (parts[0] === 'lesson' && parts.length >= 3) {
      const handler = routes['/lesson/:section/:lesson'];
      if (handler) {
        currentRoute = hash;
        handler({ section: parts[1], lesson: parts[2] });
        return;
      }
    }

    // Default to dashboard
    if (routes['/dashboard']) {
      currentRoute = '/dashboard';
      routes['/dashboard']({});
    }
  }

  function getCurrent() {
    return currentRoute;
  }

  window.addEventListener('hashchange', resolve);

  return { on, navigate, resolve, getCurrent };
})();
