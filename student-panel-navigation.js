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
  const links = [
    ['panel_estudiante.html', 'Mi panel'],
    ['asignaciones.html', 'Asignaciones'],
    ['mis-cursos.html', 'Mis Cursos'],
    ['Apuntes_admision.html', 'Apuntes'],
    ['Material_de_estudio.html', 'Material de Estudio'],
    ['https://www.bidi.unam.mx/', 'Libreria', true]
  ];
  navLinks.replaceChildren();
  const currentPage = window.location.pathname.split('/').pop() || 'panel_estudiante.html';
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
    const notificationLink = document.createElement('a');
    notificationLink.className = 'notification-button';
    notificationLink.href = 'panel_estudiante.html';
    notificationLink.title = 'Notificaciones';
    notificationLink.setAttribute('aria-label', 'Notificaciones');
    const bell = document.createElement('i');
    bell.setAttribute('data-lucide', 'bell');
    notificationLink.append(bell);
    const profileLink = actions.querySelector('.user-profile');
    profileLink ? profileLink.after(notificationLink) : actions.prepend(notificationLink);
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

  const session = JSON.parse(localStorage.getItem('studentSession') || 'null');
  const userNameLabel = navContainer.querySelector('#userNameLabel');
  if (userNameLabel && session?.nombre) userNameLabel.textContent = session.nombre;
  if (typeof lucide !== 'undefined') lucide.createIcons();

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
    if (window.innerWidth > 1100) closeMenu();
  });
})();
