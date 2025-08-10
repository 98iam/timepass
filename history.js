(function () {
  function getAttempts() {
    try {
      return JSON.parse(localStorage.getItem('quizAttempts') || '[]');
    } catch (e) {
      console.error('Failed to parse quizAttempts:', e);
      return [];
    }
  }

  function saveAttempts(attempts) {
    localStorage.setItem('quizAttempts', JSON.stringify(attempts));
  }

  function byId(id) { return document.getElementById(id); }

  function qs(selector, scope) { return (scope || document).querySelector(selector); }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleString();
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function renderList(attempts, activeId) {
    const list = byId('attempts-list');
    list.innerHTML = '';

    if (!attempts.length) {
      const empty = document.createElement('div');
      empty.className = 'list-group-item text-muted';
      empty.textContent = 'No attempts yet.';
      list.appendChild(empty);
      return;
    }

    attempts.forEach((a) => {
      const item = document.createElement('a');
      item.href = `?id=${a.id}`;
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.dataset.id = a.id;
      if (String(activeId) === String(a.id)) item.classList.add('active');

      const left = document.createElement('div');
      left.innerHTML = `<div><strong>${formatDate(a.createdAt)}</strong></div>
                        <small class="text-muted">Score: ${a.summary?.score ?? '-'} / ${a.summary?.totalQuestions ?? '-'}</small>`;

      const right = document.createElement('span');
      right.className = 'badge bg-primary rounded-pill';
      right.textContent = `${a.summary?.attempted ?? 0}`;

      item.appendChild(left);
      item.appendChild(right);

      item.addEventListener('click', (e) => {
        e.preventDefault();
        selectAttempt(a.id);
      });

      list.appendChild(item);
    });
  }

  function renderDetails(attempt) {
    const title = byId('attempt-title');
    const details = byId('attempt-details');

    if (!attempt) {
      title.textContent = 'Select an attempt';
      details.innerHTML = '<p class="text-muted mb-0">Your attempt details will appear here.</p>';
      return;
    }

    title.textContent = `Attempt on ${formatDate(attempt.createdAt)}`;

    // Summary cards
    const s = attempt.summary || {};
    const settings = attempt.settings || {};

    const sections = attempt.sections || [];

    const summaryHtml = `
      <div class="row g-3 mb-3">
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <div class="text-muted">Score</div>
              <div class="display-6">${s.score ?? '-'}</div>
              <div class="small text-muted">/ ${s.totalQuestions ?? '-'}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <div class="text-muted">Attempted</div>
              <div class="display-6">${s.attempted ?? '-'}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <div class="text-muted">Correct</div>
              <div class="display-6 text-success">${s.correct ?? '-'}</div>
            </div>
          </div>
        </div>
        <div class="col-sm-6 col-lg-3">
          <div class="card h-100">
            <div class="card-body text-center">
              <div class="text-muted">Time</div>
              <div class="display-6">${formatTime(s.timeTaken ?? 0)}</div>
              <div class="small text-muted">/ ${formatTime(s.totalTime ?? 0)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="mb-3">
        <span class="badge text-bg-light me-2">Sections: ${sections.join(', ') || '-'}</span>
        ${settings.negativeMarking ? `<span class="badge text-bg-warning">Negative Marking: ${settings.negativeMarking}</span>` : ''}
      </div>
    `;

    // Questions list
    const qList = (attempt.questions || []).map((q, idx) => renderQuestion(q, idx)).join('');

    details.innerHTML = summaryHtml +
      `<div class="accordion" id="questionsAccordion">${qList || '<div class="text-muted">No question data.</div>'}</div>` +
      `<div class="d-flex gap-2 mt-3">
        <a class="btn btn-outline-secondary" href="quiz.html">Start New Quiz</a>
        <button id="delete-attempt" class="btn btn-outline-danger">Delete This Attempt</button>
        <button id="clear-all" class="btn btn-outline-danger">Clear All Attempts</button>
      </div>`;

    // Wire delete buttons
    const delBtn = byId('delete-attempt');
    delBtn?.addEventListener('click', () => {
      if (!confirm('Delete this attempt?')) return;
      const attempts = getAttempts().filter((a) => a.id !== attempt.id);
      saveAttempts(attempts);
      // Refresh UI
      renderList(attempts, null);
      renderDetails(null);
      history.replaceState({}, '', 'history.html');
    });

    const clearAll = byId('clear-all');
    clearAll?.addEventListener('click', () => {
      if (!confirm('Clear all attempts?')) return;
      saveAttempts([]);
      renderList([], null);
      renderDetails(null);
      history.replaceState({}, '', 'history.html');
    });
  }

  function renderQuestion(q, idx) {
    const userIdx = typeof q.userAnswer === 'number' ? q.userAnswer : null; // 0-based
    const correctIdx = typeof q.correct_option === 'number' ? (q.correct_option - 1) : null; // stored as 1-based in data

    const headerClass = userIdx === correctIdx ? 'text-bg-success' : (userIdx === null ? 'text-bg-secondary' : 'text-bg-danger');
    const icon = userIdx === correctIdx ? '✅' : (userIdx === null ? '🛈' : '❌');

    const options = (q.options || []).map((opt, i) => {
      const isCorrect = correctIdx === i;
      const isUser = userIdx === i;
      const badge = isCorrect ? '<span class="badge text-bg-success ms-2">Correct</span>' : '';
      const user = isUser ? '<span class="badge text-bg-primary ms-2">Your Answer</span>' : '';
      return `<li class="list-group-item d-flex justify-content-between align-items-start ${isCorrect ? 'list-group-item-success' : ''} ${isUser && !isCorrect ? 'list-group-item-danger' : ''}">
                <div>${opt}</div>
                <div>${badge}${user}</div>
              </li>`;
    }).join('');

    const qHtml = `
      <div class="accordion-item">
        <h2 class="accordion-header" id="heading${idx}">
          <button class="accordion-button collapsed ${headerClass}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${idx}" aria-expanded="false" aria-controls="collapse${idx}">
            <span class="me-2">${icon}</span>
            Q${idx + 1}. ${escapeHtml(q.question || '')}
            <span class="ms-auto badge ${q.status === 'marked' || q.status === 'marked-answered' ? 'text-bg-warning' : 'text-bg-light'}">${q.section || ''}</span>
          </button>
        </h2>
        <div id="collapse${idx}" class="accordion-collapse collapse" aria-labelledby="heading${idx}" data-bs-parent="#questionsAccordion">
          <div class="accordion-body">
            <ol class="list-group list-group-numbered">${options}</ol>
          </div>
        </div>
      </div>
    `;

    return qHtml;
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function selectAttempt(id) {
    const attempts = getAttempts();
    const attempt = attempts.find(a => String(a.id) === String(id));
    renderList(attempts, id);
    renderDetails(attempt);
    const url = new URL(window.location);
    url.searchParams.set('id', id);
    history.replaceState({}, '', url);
  }

  function init() {
    const attempts = getAttempts();
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    renderList(attempts, idParam);

    if (attempts.length && idParam) {
      const a = attempts.find(x => String(x.id) === String(idParam));
      renderDetails(a || null);
    } else {
      renderDetails(null);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
