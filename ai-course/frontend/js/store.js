// Minimal reactive store
const store = (() => {
  const state = {
    user: null,
    token: null,
    courses: [],
    progress: { completed_lessons: [], sections: {} },
  };

  const listeners = {};

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    listeners[event] = listeners[event].filter(f => f !== fn);
  }

  function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
  }

  function set(key, value) {
    state[key] = value;
    emit(key, value);
  }

  function get(key) {
    return state[key];
  }

  return { on, off, emit, set, get, state };
})();
