// Dashboard page with section progress cards
const dashboardPage = (() => {
    function render() {
        const el = document.getElementById('page-dashboard');
        const courses = store.get('courses');
        const progress = store.get('progress');

        if (!courses.length) {
            el.innerHTML = `<div class="loading-state"><div class="spinner spinner-lg"></div><p>Loading courses...</p></div>`;
            return;
        }

        // Calculate overall progress
        const totalLessons = courses.reduce((s, c) => s + c.lessons.length, 0);
        const completedTotal = (progress.completed_lessons || []).length;
        const overallPct = totalLessons ? Math.round((completedTotal / totalLessons) * 100) : 0;

        let cardsHtml = '';
        courses.forEach(section => {
            const sp = progress.sections[section.slug] || { completed: 0, total: section.lessons.length, percentage: 0 };
            const pct = sp.percentage || 0;
            const pctClass = pct === 100 ? 'complete' : pct > 0 ? 'in-progress' : 'not-started';
            const pctLabel = pct === 100 ? '✓ Complete' : pct > 0 ? `${pct}% done` : 'Not started';

            cardsHtml += `
        <div class="section-card" onclick="router.navigate('/lesson/${section.slug}/${section.lessons[0] ? section.lessons[0].slug : ''}')">
          <div class="section-card-ring">${createProgressRing(pct, 64, 5)}</div>
          <div class="section-card-content">
            <div class="section-card-title">${section.title}</div>
            <div class="section-card-desc">${section.description}</div>
            <div class="section-card-meta">
              <span class="section-card-lessons">${sp.total} lessons</span>
              <span class="section-card-percent ${pctClass}">${pctLabel}</span>
            </div>
          </div>
        </div>
      `;
        });

        el.innerHTML = `
      <div class="dashboard-header">
        <h1>Python Course</h1>
        <p>Master Python from fundamentals to expert-level techniques</p>
      </div>
      <div class="overall-progress">
        <div class="overall-progress-text">
          <h3>Overall Progress</h3>
          <p>${completedTotal} of ${totalLessons} lessons completed</p>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${overallPct}%"></div>
          </div>
          <div class="progress-bar-label">
            <span>${overallPct}% complete</span>
            <span>${totalLessons - completedTotal} remaining</span>
          </div>
        </div>
      </div>
      <div class="sections-grid">${cardsHtml}</div>
    `;
    }

    return { render };
})();
