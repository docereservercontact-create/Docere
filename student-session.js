(() => {
  const sessionKey = 'studentSession';
  const activityKey = 'studentSessionLastActivity';
  const idleLimit = 60 * 60 * 1000;
  let redirecting = false;
  let lastRecordedActivity = Number(localStorage.getItem(activityKey));

  function redirectToLogin() {
    if (redirecting) return;
    redirecting = true;
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(activityKey);
    window.location.replace('login.html');
  }

  function hasActiveSession() {
    const sessionRaw = localStorage.getItem(sessionKey);
    const lastActivity = Number(localStorage.getItem(activityKey));
    if (!sessionRaw || !Number.isFinite(lastActivity) || Date.now() - lastActivity >= idleLimit) {
      return false;
    }

    try {
      return Boolean(JSON.parse(sessionRaw)?.email);
    } catch {
      return false;
    }
  }

  if (!hasActiveSession()) {
    redirectToLogin();
    return;
  }

  function recordActivity() {
    const now = Date.now();
    if (now - lastRecordedActivity < 5000) return;
    if (!hasActiveSession()) {
      redirectToLogin();
      return;
    }
    localStorage.setItem(activityKey, String(now));
    lastRecordedActivity = now;
  }

  ['click', 'keydown', 'pointerdown', 'touchstart', 'mousemove', 'wheel', 'scroll'].forEach((eventName) => {
    document.addEventListener(eventName, recordActivity, { passive: true });
  });

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (link && !hasActiveSession()) {
      event.preventDefault();
      redirectToLogin();
    }
  }, true);

  window.addEventListener('storage', (event) => {
    if ((event.key === sessionKey || event.key === activityKey) && !hasActiveSession()) {
      redirectToLogin();
    }
  });

  window.setInterval(() => {
    if (!hasActiveSession()) redirectToLogin();
  }, 15000);
})();