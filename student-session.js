(() => {
  const sessionKey = 'studentSession';
  const activityKey = 'studentSessionLastActivity';
  const idleLimit = 60 * 60 * 1000;
  let redirecting = false;
  let lastRecordedActivity = Number(localStorage.getItem(activityKey));

  async function redirectToLogin() {
    if (redirecting) return;
    redirecting = true;
    let student = null;
    try {
      student = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    } catch {
      student = null;
    }
    if (student) {
      try {
        const { logSessionEvent } = await import('./session-audit.js');
        await logSessionEvent(student, 'cierre_sesion', 'alumno', 'inactividad');
      } catch (error) {
        console.error('No se pudo registrar el cierre de sesión del alumno:', error);
      }
    }
    try {
      const { signOutPortalUser } = await import('./portal-auth.js');
      await signOutPortalUser();
    } catch (error) {
      console.error('No se pudo cerrar la sesión segura de Firebase:', error);
    }
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

  function showActivityNotice() {
    if (document.getElementById('studentActivityNotice')) return;
    const style = document.createElement('style');
    style.textContent = '#studentActivityNotice{padding:9px 16px;background:#eff6ff;border-bottom:1px solid #bfdbfe;color:#1e3a8a;font:600 13px/1.5 system-ui,sans-serif;text-align:center}';
    document.head.append(style);
    const notice = document.createElement('aside');
    notice.id = 'studentActivityNotice';
    notice.setAttribute('role', 'note');
    notice.textContent = 'Toda actividad dentro de la plataforma tiene un registro';
    document.body.prepend(notice);
  }

  function startActivityTracking() {
    let student;
    try {
      student = JSON.parse(localStorage.getItem(sessionKey) || 'null');
    } catch (error) {
      console.error('No se pudo leer la sesión para registrar actividad del alumno:', error);
      return;
    }
    const page = window.location.pathname.split('/').pop() || 'pagina';
    import('./session-audit.js')
      .then(({ startStudentPageVisit }) => startStudentPageVisit(student, page))
      .then((visit) => {
        if (!visit) return;
        let visibleSince = document.visibilityState === 'visible' ? Date.now() : null;
        let visibleMilliseconds = 0;
        let ended = false;
        const getVisibleSeconds = () => Math.floor(
          (visibleMilliseconds + (visibleSince === null ? 0 : Date.now() - visibleSince)) / 1000
        );
        const persistDuration = (event) => visit.updateDuration(event, getVisibleSeconds());
        const stopVisibleTimer = () => {
          if (visibleSince === null) return;
          visibleMilliseconds += Date.now() - visibleSince;
          visibleSince = null;
        };
        const beginVisibleTimer = () => {
          if (visibleSince !== null) return;
          visibleSince = Date.now();
        };
        const finishVisit = () => {
          if (ended) return;
          ended = true;
          stopVisibleTimer();
          window.clearInterval(durationTimer);
          void persistDuration('salida_pagina');
        };

        const durationTimer = window.setInterval(() => {
          if (!ended) void persistDuration('actividad_pagina');
        }, 30000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') {
            stopVisibleTimer();
            void persistDuration('actividad_pagina');
          } else {
            beginVisibleTimer();
          }
        });
        window.addEventListener('pagehide', finishVisit, { once: true });
        document.addEventListener('click', (event) => {
          if (!(event.target instanceof Element)) return;
          const control = event.target.closest(
            'a[href],button,input[type="button"],input[type="submit"],input[type="reset"],input[type="checkbox"],input[type="radio"],select,summary,[role="button"],[role="link"],[role="tab"],[role="checkbox"]'
          );
          if (!control) return;
          const controlLabel = control.getAttribute('data-activity-label')
            || control.getAttribute('aria-label')
            || control.getAttribute('title')
            || (control.matches('a,button,summary,[role="button"],[role="link"],[role="tab"]')
              ? control.textContent
              : '')
            || control.id
            || control.tagName.toLocaleLowerCase();
          const label = controlLabel.replace(/\s+/g, ' ').trim().slice(0, 120);
          void visit.recordClick(label || control.tagName.toLocaleLowerCase(), control.tagName.toLocaleLowerCase());
        }, true);
      })
      .catch((error) => {
        console.error('No se pudo iniciar el registro de actividad del alumno:', error);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      showActivityNotice();
      startActivityTracking();
    }, { once: true });
  } else {
    showActivityNotice();
    startActivityTracking();
  }

  const currentPage = window.location.pathname.split('/').pop();
  if (currentPage !== 'mis-cursos.html') {
    import('./student-access.js')
      .then(async ({ getStudentAbsenceStatus }) => {
        if (!hasActiveSession()) return;
        const student = JSON.parse(localStorage.getItem(sessionKey) || 'null');
        const absenceStatus = await getStudentAbsenceStatus(student);
        if (absenceStatus.isSuspended) window.location.replace('mis-cursos.html');
      })
      .catch((error) => {
        console.error('No se pudo verificar el estado de asistencia:', error);
      });
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