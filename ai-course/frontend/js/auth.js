// Token persistence
const auth = (() => {
  const TOKEN_KEY = 'bbg_ai_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
    store.set('token', token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    store.set('token', null);
    store.set('user', null);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function logout() {
    clearToken();
    store.set('courses', []);
    store.set('progress', { completed_lessons: [], sections: {} });
    router.navigate('/auth');
  }

  // Restore token on load
  const savedToken = getToken();
  if (savedToken) {
    store.set('token', savedToken);
  }

  return { getToken, setToken, clearToken, isLoggedIn, logout };
})();
