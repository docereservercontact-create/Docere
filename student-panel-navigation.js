(() => {
  const menuButton = document.getElementById('studentMenuToggle');
  const navLinks = document.getElementById('studentNavLinks');
  if (!menuButton || !navLinks) return;

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
