// App bootstrap: auth check, data load, router start
const app = (() => {
  function showApp() {
    document.getElementById('auth-overlay').classList.remove('visible');
    document.getElementById('app').classList.add('visible');
  }

  function showAuth() {
    document.getElementById('app').classList.remove('visible');
    document.getElementById('auth-overlay').classList.add('visible');
    authPage.render();
  }

  async function loadUserData() {
    try {
      const [user, courses, progress] = await Promise.all([
        api.me(),
        api.getCourses(),
        api.getProgress(),
      ]);
      store.set('user', user);
      store.set('courses', courses);
      store.set('progress', progress);
      showApp();
      router.resolve();
    } catch (err) {
      auth.clearToken();
      showAuth();
    }
  }

  async function init() {
    // Configure Prism autoloader
    if (window.Prism && Prism.plugins && Prism.plugins.autoloader) {
      Prism.plugins.autoloader.languages_path =
        'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/';
    }

    // Configure marked
    if (window.marked) {
      marked.setOptions({ gfm: true, breaks: false });
    }

    // Setup router
    router.on('/dashboard', () => {
      showPage('dashboard');
      dashboardPage.render();
    });

    router.on('/lesson/:section/:lesson', ({ section, lesson }) => {
      showPage('lesson');
      lessonPage.render(section, lesson);
    });

    router.on('/auth', () => {
      showAuth();
    });

    // Initialize sidebar
    sidebar.init();

    // Check auth status
    if (auth.isLoggedIn()) {
      await loadUserData();
    } else {
      showAuth();
    }
  }

  function showPage(name) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`page-${name}`);
    if (page) page.classList.add('active');
  }

  return { init, loadUserData };
})();

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', () => app.init());
