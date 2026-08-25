document.addEventListener('DOMContentLoaded', () => {

  // 1. Inicializar los iconos de Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // ==========================================
  // 2. MODO OSCURO / CLARO
  // ==========================================
  const themeToggleBtn = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDarkMode = document.body.classList.contains('dark-mode');

      // Cambiar icono
      if (themeIcon) {
        themeIcon.setAttribute('data-lucide', isDarkMode ? 'sun' : 'moon');
        lucide.createIcons();
      }
    });
  }

  // ==========================================
  // 3. MENÚ RESPONSIVE (MÓVIL)
  // ==========================================
  const menuToggleBtn = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggleBtn && navLinks) {
    menuToggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });

    // Cerrar menú al dar clic en un enlace
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('active');
      });
    });
  }

  // ==========================================
  // 3.1. MENÚ ACTIVO SEGÚN PÁGINA Y SECCIÓN
  // ==========================================
  const pageLinks = document.querySelectorAll('.nav-links a');
  const currentPath = window.location.pathname.substring(window.location.pathname.lastIndexOf('/') + 1) || 'index.html';
  const normalizedPath = currentPath === '' ? 'index.html' : currentPath;

  pageLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) return; // links ancla se manejan por scrollspy

    const linkPage = href.split('#')[0] || 'index.html';
    const normalizedLinkPage = linkPage === '' ? 'index.html' : linkPage;

    if (normalizedLinkPage === normalizedPath) {
      link.classList.add('current');
    }
  });

  const anchorLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]:not([href="#"])'));
  const sections = anchorLinks
    .map(link => {
      const id = link.getAttribute('href').substring(1);
      return document.getElementById(id);
    })
    .filter(Boolean);

  function setCurrentLink(link) {
    anchorLinks.forEach(item => item.classList.remove('current'));
    if (link) {
      link.classList.add('current');
    }
  }

  function updateScrollSpy() {
    let activeLink = null;

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.35 && rect.bottom > window.innerHeight * 0.35) {
        activeLink = document.querySelector(`.nav-links a[href="#${section.id}"]`);
      }
    });

    setCurrentLink(activeLink);
  }

  if (sections.length) {
    updateScrollSpy();
    window.addEventListener('scroll', updateScrollSpy);
  }

  // ==========================================
  // 4. CARRUSEL SLIDER AUTOMÁTICO
  // ==========================================
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('.dot');
  let currentSlide = 0;
  const totalSlides = dots.length;

  function goToSlide(index) {
    currentSlide = index;
    if (track) {
      // Mueve el contenedor horizontalmente
      track.style.transform = `translateX(-${currentSlide * (100 / totalSlides)}%)`;
    }

    // Actualiza los puntos indicadores (dots)
    dots.forEach(dot => dot.classList.remove('active'));
    if (dots[currentSlide]) {
      dots[currentSlide].classList.add('active');
    }
  }

  // Transición automática cada 4.5 segundos
  let autoSlide = setInterval(() => {
    currentSlide = (currentSlide + 1) % totalSlides;
    goToSlide(currentSlide);
  }, 4500);

  // Permitir clic en los puntitos para cambiar de slide
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const slideIndex = parseInt(e.target.getAttribute('data-slide'));
      goToSlide(slideIndex);

      // Reiniciar el temporizador al hacer clic para evitar saltos repentinos
      clearInterval(autoSlide);
      autoSlide = setInterval(() => {
        currentSlide = (currentSlide + 1) % totalSlides;
        goToSlide(currentSlide);
      }, 4500);
    });
  });

  // ==========================================
  // 5. BUSCADOR INTERACTIVO
  // ==========================================
  const searchInput = document.getElementById('searchInput');
  const searchResults = document.getElementById('searchResults');

  // Base de datos local para la búsqueda rápida
  const cursosDisponibles = [
    { nombre: 'Regularización de Matemáticas, Física y Química', link: '#servicios' },
    { nombre: 'Curso de Ingreso a Universidad (UNAM, IPN, UAM)', link: '#servicios' },
    { nombre: 'Programación: Python, C y Javascript', link: '#servicios' },
    { nombre: 'Ofimática: Excel Avanzado, Word, PowerPoint', link: '#servicios' },
    { nombre: 'Electrónica y Microcontroladores Arduino', link: '#servicios' },
    { nombre: 'Impresión y Modelado 3D', link: '#servicios' },
    { nombre: 'Cursos Propedéuticos (Ingeniería, Medicina)', link: '#servicios' },
    { nombre: 'Asesorías Express y Ayuda en Tareas', link: '#express' }
  ];

  if (searchInput && searchResults) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      searchResults.innerHTML = '';

      if (query === '') {
        searchResults.classList.add('hidden');
        return;
      }

      const resultados = cursosDisponibles.filter(curso => 
        curso.nombre.toLowerCase().includes(query)
      );

      if (resultados.length > 0) {
        resultados.forEach(curso => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.textContent = curso.nombre;
          item.addEventListener('click', () => {
            window.location.href = curso.link;
            searchInput.value = '';
            searchResults.classList.add('hidden');
          });
          searchResults.appendChild(item);
        });
        searchResults.classList.remove('hidden');
      } else {
        const noResult = document.createElement('div');
        noResult.className = 'search-item';
        noResult.style.color = '#888';
        noResult.textContent = 'No se encontraron temas relacionados.';
        searchResults.appendChild(noResult);
        searchResults.classList.remove('hidden');
      }
    });

    // Ocultar buscador si se da clic fuera
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.classList.add('hidden');
      }
    });
  }

  // ==========================================
  // 6. PREGUNTAS FRECUENTES (ACORDEÓN)
  // ==========================================
  const faqQuestions = document.querySelectorAll('.faq-question');

  faqQuestions.forEach(question => {
    question.addEventListener('click', () => {
      const faqItem = question.parentElement;
      const isActive = faqItem.classList.contains('active');

      // Cerrar los demás items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
      });

      // Alternar el item actual
      if (!isActive) {
        faqItem.classList.add('active');
      }
    });
  });

  // ==========================================
  // 7. FORMULARIO DE CONTACTO
  // ==========================================
  const contactForm = document.getElementById('contactForm');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      alert('¡Gracias por ponerte en contacto! Un asesor académico se comunicará contigo muy pronto.');
      contactForm.reset();
    });
  }

});