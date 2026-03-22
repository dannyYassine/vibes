const sidebar = (() => {
  function render() {
    const nav = document.getElementById('sidebar-nav');
    const courses = store.get('courses');
    const progress = store.get('progress');
    const user = store.get('user');
    const hash = window.location.hash.slice(1) || '/dashboard';

    // Update user info
    if (user) {
      const avatar = document.getElementById('sidebar-avatar');
      const username = document.getElementById('sidebar-username');
      if (avatar) avatar.textContent = user.username[0].toUpperCase();
      if (username) username.textContent = user.username;
    }

    // Dashboard link
    const isDashboard = hash === '/dashboard' || hash === '';
    let html = `
      <div class="sidebar-dashboard-link ${isDashboard ? 'active' : ''}" onclick="router.navigate('/dashboard')">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 2h5v5H2zm0 7h5v5H2zm7-7h5v5H9zm0 7h5v5H9z"/>
        </svg>
        Dashboard
      </div>
    `;

    // Section groups
    courses.forEach(section => {
      const sp = progress.sections[section.slug] || { completed: 0, total: section.lessons.length, percentage: 0 };
      const completedLessons = new Set(progress.completed_lessons || []);

      // Is any lesson in this section active?
      const isExpanded = hash.includes(section.slug) || sp.completed > 0;

      html += `
        <div class="section-group ${isExpanded ? 'expanded' : ''}" data-section="${section.slug}">
          <div class="section-header" onclick="sidebar.toggleSection('${section.slug}')">
            <svg class="section-chevron" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
            </svg>
            <span class="section-name">${section.title}</span>
            <span class="section-progress-text">${sp.completed}/${sp.total}</span>
          </div>
          <ul class="lesson-list">
      `;

      section.lessons.forEach(lesson => {
        const lessonId = `${section.slug}/${lesson.slug}`;
        const isCompleted = completedLessons.has(lessonId);
        const isActive = hash === `/lesson/${section.slug}/${lesson.slug}`;

        html += `
          <li class="lesson-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}"
              onclick="router.navigate('/lesson/${section.slug}/${lesson.slug}')">
            <svg class="lesson-check" viewBox="0 0 16 16" fill="currentColor">
              <circle class="lesson-uncheck-icon" cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
              <path class="lesson-check-icon" d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 6.237l-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 111.06-1.06l1.47 1.47 3.97-3.97a.75.75 0 111.06 1.06z"/>
            </svg>
            <span class="lesson-title">${lesson.title}</span>
          </li>
        `;
      });

      html += `</ul></div>`;
    });

    nav.innerHTML = html;
  }

  function toggleSection(slug) {
    const group = document.querySelector(`.section-group[data-section="${slug}"]`);
    if (group) group.classList.toggle('expanded');
  }

  function init() {
    // Re-render when data changes
    store.on('courses', render);
    store.on('progress', render);
    store.on('user', render);
    window.addEventListener('hashchange', render);

    // Mobile toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebarEl = document.querySelector('.sidebar');
    if (toggleBtn && sidebarEl) {
      toggleBtn.addEventListener('click', () => {
        sidebarEl.classList.toggle('open');
      });
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (sidebarEl.classList.contains('open') &&
            !sidebarEl.contains(e.target) &&
            e.target !== toggleBtn) {
          sidebarEl.classList.remove('open');
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('sidebar-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => auth.logout());
    }
  }

  return { render, toggleSection, init };
})();
