// All API calls with Bearer token injection
const api = (() => {
  const BASE = '/api';

  async function request(method, path, body) {
    const token = store.get('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);

    if (res.status === 401) {
      auth.clearToken();
      router.navigate('/auth');
      throw new Error('Unauthorized');
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {}
      throw new Error(detail);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  return {
    // Auth
    register: (data) => request('POST', '/auth/register', data),
    login: (data) => request('POST', '/auth/login', data),
    me: () => request('GET', '/auth/me'),

    // Courses
    getCourses: () => request('GET', '/courses'),
    getLesson: (section, lesson) => request('GET', `/courses/${section}/${lesson}`),

    // Progress
    getProgress: () => request('GET', '/progress'),
    toggleLesson: (section, lesson) => request('POST', `/progress/${section}/${lesson}`),
  };
})();
