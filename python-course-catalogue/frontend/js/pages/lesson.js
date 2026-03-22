// Lesson page: fetch → marked.parse → Prism.highlight
const lessonPage = (() => {
  let currentLesson = null;

  async function render(section, lesson) {
    const el = document.getElementById('page-lesson');
    el.innerHTML = `<div class="loading-state"><div class="spinner spinner-lg"></div><p>Loading lesson...</p></div>`;

    try {
      const data = await api.getLesson(section, lesson);
      currentLesson = data;

      // Find section title
      const courses = store.get('courses');
      const sectionData = courses.find(c => c.slug === section);
      const sectionTitle = sectionData ? sectionData.title : section;

      // Render markdown
      const htmlContent = marked.parse(data.raw_markdown, {
        gfm: true,
        breaks: false,
      });

      // Duration label
      const durationLabel = data.duration_minutes
        ? `<span class="lesson-duration">⏱ ${data.duration_minutes} min</span>`
        : '';

      el.innerHTML = `
        <div class="lesson-header">
          <div class="lesson-breadcrumb">${sectionTitle} <span>/ ${data.title}</span></div>
          <h1 class="lesson-title">${data.title}</h1>
          <div class="lesson-meta">
            ${durationLabel}
            ${data.description ? `<span class="badge badge-gray">${data.description}</span>` : ''}
          </div>
        </div>
        <div class="prose" id="lesson-body">${htmlContent}</div>
        <div id="lesson-nav-area">${renderLessonNav(data)}</div>
      `;

      // Syntax highlight all code blocks
      if (window.Prism) {
        Prism.highlightAllUnder(el);
      }

    } catch (err) {
      el.innerHTML = `
        <div class="loading-state">
          <p style="color: var(--accent-red)">Failed to load lesson: ${err.message}</p>
          <button class="btn btn-secondary" onclick="router.navigate('/dashboard')">← Back to Dashboard</button>
        </div>
      `;
    }
  }

  function getCurrent() {
    return currentLesson;
  }

  return { render, getCurrent };
})();
