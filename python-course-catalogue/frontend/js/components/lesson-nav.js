// Prev/Next/Mark Complete navigation
function renderLessonNav(lessonData) {
  const progress = store.get('progress');
  const completedLessons = new Set(progress.completed_lessons || []);
  const lessonId = `${lessonData.section_slug}/${lessonData.slug}`;
  const isCompleted = completedLessons.has(lessonId);

  let prevHtml = '';
  let nextHtml = '';

  if (lessonData.prev_lesson) {
    prevHtml = `
      <div class="lesson-nav-label">← Previous</div>
      <div class="lesson-nav-title" onclick="router.navigate('/lesson/${lessonData.section_slug}/${lessonData.prev_lesson}')">
        ${lessonData.prev_lesson.replace(/^\d+-/, '').replace(/-/g, ' ')}
      </div>
    `;
  }

  if (lessonData.next_lesson) {
    nextHtml = `
      <div class="lesson-nav-label">Next →</div>
      <div class="lesson-nav-title" onclick="router.navigate('/lesson/${lessonData.section_slug}/${lessonData.next_lesson}')">
        ${lessonData.next_lesson.replace(/^\d+-/, '').replace(/-/g, ' ')}
      </div>
    `;
  }

  const completeLabel = isCompleted ? '✓ Completed' : 'Mark Complete';
  const completeBtnClass = isCompleted ? 'mark-complete-btn completed' : 'mark-complete-btn';

  return `
    <div class="lesson-nav">
      <div class="lesson-nav-side left">${prevHtml}</div>
      <div class="lesson-nav-center">
        <button class="${completeBtnClass}" id="mark-complete-btn" onclick="toggleLessonComplete('${lessonData.section_slug}', '${lessonData.slug}')">
          ${completeLabel}
        </button>
      </div>
      <div class="lesson-nav-side right">${nextHtml}</div>
    </div>
  `;
}

async function toggleLessonComplete(section, lesson) {
  try {
    const result = await api.toggleLesson(section, lesson);
    // Refresh progress
    const progress = await api.getProgress();
    store.set('progress', progress);
    toast[result.completed ? 'success' : 'info'](
      result.completed ? 'Lesson marked complete!' : 'Lesson marked incomplete'
    );
    // Re-render nav area
    const btn = document.getElementById('mark-complete-btn');
    if (btn) {
      const isCompleted = result.completed;
      btn.className = isCompleted ? 'mark-complete-btn completed' : 'mark-complete-btn';
      btn.textContent = isCompleted ? '✓ Completed' : 'Mark Complete';
    }
  } catch (e) {
    toast.error('Failed to update progress');
  }
}
