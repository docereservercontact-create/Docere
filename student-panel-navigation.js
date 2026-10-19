(() => {
  const navbar = document.querySelector('nav.navbar');
  const navContainer = navbar?.querySelector('.student-nav-container, .nav-container');
  if (!navbar || !navContainer) return;

  navbar.classList.add('student-navbar');
  navContainer.classList.add('student-nav-container');

  const brand = navContainer.querySelector('.student-brand, .brand');
  if (brand) {
    brand.classList.add('student-brand');
    if (!brand.querySelector('img')) {
      const logo = document.createElement('img');
      logo.src = 'logon.png';
      logo.alt = 'Docére';
      brand.replaceChildren(logo);
    }
  }

  let menuButton = navContainer.querySelector('#studentMenuToggle, .student-menu-toggle, .menu-toggle');
  if (menuButton) {
    menuButton.id = 'studentMenuToggle';
    menuButton.classList.add('student-menu-toggle');
    menuButton.setAttribute('aria-label', 'Abrir menú');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-controls', 'studentNavLinks');
  }

  const navLinks = navContainer.querySelector('#studentNavLinks, .student-nav-links, .nav-links');
  if (!navLinks) return;
  navLinks.id = 'studentNavLinks';
  navLinks.classList.add('student-nav-links');
  const currentPage = window.location.pathname.split('/').pop() || 'panel_estudiante.html';
  const links = [
    ['panel_estudiante.html', 'Mi panel'],
    ['asignaciones.html', 'Asignaciones'],
    [currentPage === 'panel_estudiante.html' ? '#pagos' : 'panel_estudiante.html#pagos', 'Pagos'],
    ['examenes-simulacros-estudiante.html', 'Exámenes simulacros'],
    ['mis-cursos.html', 'Mis Cursos'],
    ['Apuntes_admision.html', 'Apuntes'],
    ['Material_de_estudio.html', 'Material de Estudio'],
    ['https://www.bidi.unam.mx/', 'Libreria', true]
  ];
  navLinks.replaceChildren();
  links.forEach(([href, label, external]) => {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    } else if (href === currentPage) {
      link.setAttribute('aria-current', 'page');
    }
    listItem.append(link);
    navLinks.append(listItem);
  });

  let actions = navContainer.querySelector('.student-nav-actions, .nav-actions');
  if (!actions) {
    actions = document.createElement('div');
    navContainer.append(actions);
  }
  actions.classList.add('student-nav-actions');

  if (!actions.querySelector('.user-profile')) {
    const profileLink = document.createElement('a');
    profileLink.className = 'user-profile';
    profileLink.href = 'perfil.html';
    profileLink.title = 'Ir a mi perfil';
    const avatar = document.createElement('span');
    avatar.className = 'avatar-wrapper';
    const avatarIcon = document.createElement('i');
    avatarIcon.setAttribute('data-lucide', 'user-round');
    avatar.append(avatarIcon);
    const userInfo = document.createElement('span');
    userInfo.className = 'user-info';
    const userName = document.createElement('span');
    userName.className = 'user-name';
    userName.id = 'userNameLabel';
    userName.textContent = 'Alumno';
    const userRole = document.createElement('span');
    userRole.className = 'user-role';
    userRole.textContent = 'Estudiante';
    userInfo.append(userName, userRole);
    profileLink.append(avatar, userInfo);
    actions.prepend(profileLink);
  }

  if (!actions.querySelector('.notification-button')) {
    const notificationWrapper = document.createElement('div');
    notificationWrapper.className = 'notification-wrapper';
    const notificationButton = document.createElement('button');
    notificationButton.type = 'button';
    notificationButton.className = 'notification-button';
    notificationButton.id = 'studentNotificationButton';
    notificationButton.title = 'Notificaciones';
    notificationButton.setAttribute('aria-label', 'Notificaciones');
    notificationButton.setAttribute('aria-expanded', 'false');
    notificationButton.setAttribute('aria-controls', 'studentNotificationPanel');
    const bell = document.createElement('i');
    bell.setAttribute('data-lucide', 'bell');
    const count = document.createElement('span');
    count.className = 'notification-count';
    count.id = 'studentNotificationCount';
    count.hidden = true;
    notificationButton.append(bell, count);
    const panel = document.createElement('section');
    panel.className = 'notification-panel';
    panel.id = 'studentNotificationPanel';
    panel.setAttribute('aria-label', 'Notificaciones');
    panel.hidden = true;
    const panelHeader = document.createElement('div');
    panelHeader.className = 'notification-panel-header';
    const panelTitle = document.createElement('h2');
    panelTitle.textContent = 'Notificaciones';
    const markReadButton = document.createElement('button');
    markReadButton.type = 'button';
    markReadButton.className = 'notification-mark-read';
    markReadButton.id = 'studentNotificationMarkRead';
    markReadButton.textContent = 'Marcar leídas';
    const list = document.createElement('div');
    list.className = 'notification-list';
    list.id = 'studentNotificationList';
    panelHeader.append(panelTitle, markReadButton);
    panel.append(panelHeader, list);
    notificationWrapper.append(notificationButton, panel);
    const profileLink = actions.querySelector('.user-profile');
    profileLink ? profileLink.after(notificationWrapper) : actions.prepend(notificationWrapper);
  }

  if (!actions.querySelector('#btnIngresarClase')) {
    const classLink = document.createElement('a');
    classLink.id = 'btnIngresarClase';
    classLink.className = 'btn btn-primary';
    classLink.href = 'panel_estudiante.html#btnIngresarClase';
    const videoIcon = document.createElement('i');
    videoIcon.setAttribute('data-lucide', 'video');
    const classLabel = document.createElement('span');
    classLabel.textContent = 'Entrar a clase';
    classLink.append(videoIcon, classLabel);
    actions.append(classLink);
  }

  if (!actions.querySelector('#btnCerrarSesion')) {
    const logoutButton = document.createElement('button');
    logoutButton.id = 'btnCerrarSesion';
    logoutButton.type = 'button';
    logoutButton.className = 'btn btn-outline';
    const logoutIcon = document.createElement('i');
    logoutIcon.setAttribute('data-lucide', 'log-out');
    const logoutLabel = document.createElement('span');
    logoutLabel.textContent = 'Cerrar sesión';
    logoutButton.append(logoutIcon, logoutLabel);
    actions.append(logoutButton);
    logoutButton.addEventListener('click', async () => {
      if (!confirm('¿Deseas cerrar sesión?')) return;
      const session = JSON.parse(localStorage.getItem('studentSession') || 'null');
      try {
        const { logSessionEvent } = await import('./session-audit.js');
        await logSessionEvent(session, 'cierre_sesion', 'alumno');
      } catch (error) {
        console.error('No se pudo registrar el cierre de sesión del alumno:', error);
      }
      try {
        const { signOutPortalUser } = await import('./portal-auth.js');
        await signOutPortalUser();
      } catch (error) {
        console.error('No se pudo cerrar la sesión segura de Firebase:', error);
      }
      localStorage.removeItem('studentSession');
      localStorage.removeItem('studentSessionLastActivity');
      window.location.href = 'index.html';
    });
  }

  const session = JSON.parse(localStorage.getItem('studentSession') || 'null');
  const userNameLabel = navContainer.querySelector('#userNameLabel');
  if (userNameLabel && session?.nombre) userNameLabel.textContent = session.nombre;
  if (typeof lucide !== 'undefined') lucide.createIcons();
  import('./student-notifications.js')
    .then(({ initializeStudentNotifications }) => initializeStudentNotifications())
    .catch((error) => console.error('No se pudo iniciar el centro de notificaciones del alumno:', error));

  if (!menuButton) return;

  function closeMenu() {
    navLinks.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }

  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1400) closeMenu();
  });
})();
