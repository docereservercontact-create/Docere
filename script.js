// =========================================================================
// INTEGRACIÓN DE FIREBASE (Auth + Firestore)
// =========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC64X_uSvL_Sn1WQLw7ZV9QDme2aOfV5ag",
  authDomain: "docere-931ec.firebaseapp.com",
  projectId: "docere-931ec",
  storageBucket: "docere-931ec.firebasestorage.app",
  messagingSenderId: "1005663843239",
  appId: "1:1005663843239:web:d8f6c7524a5d10bf797c82",
  measurementId: "G-B6TDT4VE7S"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// =========================================================================
// MÓDULOS DE AUTENTICACIÓN Y PERSISTENCIA EN FIRESTORE
// =========================================================================

/**
 * Registra un nuevo alumno en Firebase Auth y crea su documento en Firestore
 */
async function registrarAlumno(datosRegistro) {
  const { 
    email, 
    password, 
    nombre, 
    primerApellido,
    segundoApellido,
    telefono, 
    curp, 
    curso, 
    turno,
    metodoPagoToken, 
    ultimos4, 
    marcaTarjeta 
  } = datosRegistro;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    const apellidos = `${primerApellido || ''} ${segundoApellido || ''}`.trim();

    const userDocRef = doc(db, "users", uid);
    await setDoc(userDocRef, {
      nombre: nombre || "",
      primerApellido: primerApellido || "",
      segundoApellido: segundoApellido || "",
      apellidos: apellidos,
      correo: email,
      telefono: telefono || "",
      curp: curp || "",
      curso: curso || "Curso de Preparación UNAM",
      turno: turno || "Matutino",
      fechaRegistro: new Date().toISOString(),
      metodoPago: {
        token: metodoPagoToken || "tok_simulado_pago",
        ultimos4: ultimos4 || "4242",
        marca: marcaTarjeta || "Visa",
        estadoPago: "Completado"
      }
    });

    return { success: true, uid };
  } catch (error) {
    console.error("Error al registrar alumno en Firebase:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Inicia sesión de un usuario registrado
 */
async function iniciarSesion(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Cierra la sesión activa
 */
async function cerrarSesion() {
  try {
    await signOut(auth);
    localStorage.removeItem('studentSession');
    window.location.href = 'index.html';
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
}

/**
 * Actualiza los elementos del DOM de la UI con los datos del alumno
 */
function aplicarDatosEnDOM(data, docId = '') {
  if (!data) return;

  const nombre = data.nombre || data.asp_nombre || '';
  const ap1 = data.primerApellido || data.asp_apellido1 || '';
  const ap2 = data.segundoApellido || data.asp_apellido2 || '';
  const apellidos = data.apellidos || `${ap1} ${ap2}`.trim();
  const nombreCompleto = data.nombreCompleto || `${nombre} ${apellidos}`.trim();
  const correo = data.correo || data.email || '';
  const telefono = data.telefono || data.telAlumno || '';
  const telTutor = data.telefonoTutor || data.telTutor || '';
  const curso = data.curso || data.datosAcademicos?.curso || 'Curso de Preparación UNAM';
  const turno = data.turno || data.datosAcademicos?.modalidad || 'En Línea';
  const curp = data.curp || '';

  // 1. Actualización de etiquetas de la barra de navegación y encabezados
  const setContent = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setContent('userNameLabel', nombre || 'Alumno');
  setContent('navUserName', nombre || 'Alumno');
  setContent('welcomeTitle', `¡Bienvenido, ${nombre || 'Alumno'}! 👋`);
  setContent('fullNameLabel', nombreCompleto || 'Perfil del Alumno');
  setContent('profileHeaderName', nombreCompleto || 'Perfil del Alumno');
  setContent('emailHeaderLabel', correo || '--');
  setContent('profileHeaderEmail', correo || '--');

  // 2. Vista Perfil (Spans / Etiquetas)
  setContent('valNombre', nombre || '--');
  setContent('valApellido1', ap1 || '--');
  setContent('valApellido2', ap2 || '--');
  setContent('valCurp', curp || '--');
  setContent('valEmail', correo || '--');
  setContent('valTelefono', telefono || '--');
  setContent('valTelTutor', telTutor || '--');
  setContent('valCurso', curso || '--');
  setContent('valTurno', turno || '--');

  // 3. Formulario de Edición o Inputs del perfil
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val;
  };

  setVal('inputNombre', nombre);
  setVal('editNombre', nombre);

  setVal('inputApellidos', apellidos);
  setVal('editApellido1', ap1);
  setVal('editApellido2', ap2);

  setVal('inputCorreo', correo);
  setVal('inputTelefono', telefono);
  setVal('editTelefono', telefono);
  setVal('editTelTutor', telTutor);

  setVal('inputCurp', curp);
  setVal('inputCurso', curso);
  setVal('inputFolio', docId || 'DOC-2026-001');
}

/**
 * Carga los datos mapeados desde la colección 'aspirantes_admision'
 */
async function cargarDesdeAspirantesAdmision() {
  try {
    const params = new URLSearchParams(window.location.search);
    let docId = params.get('id');
    let data = null;

    if (docId) {
      const docRef = doc(db, "aspirantes_admision", docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        data = docSnap.data();
      }
    } else {
      const q = query(collection(db, "aspirantes_admision"), orderBy("fechaRegistro", "desc"), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        docId = docSnap.id;
        data = docSnap.data();
      }
    }

    if (data) {
      aplicarDatosEnDOM(data, docId);
    }
  } catch (error) {
    console.error("Error leyendo aspirantes_admision:", error);
  }
}

/**
 * Escucha la autenticación y gestiona la carga de datos
 */
function gestionarEstadoPerfil() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          aplicarDatosEnDOM(docSnap.data(), user.uid);
        } else {
          await cargarDesdeAspirantesAdmision();
        }
      } catch (error) {
        console.error("Error al obtener documento de usuarios:", error);
      }
    } else {
      // Si no hay sesión iniciada en Firebase Auth, valida la sesión local o aspirantes
      const sessionRaw = localStorage.getItem('studentSession');
      if (sessionRaw) {
        try {
          const session = JSON.parse(sessionRaw);
          aplicarDatosEnDOM(session);
        } catch (e) {
          console.error("Error leyendo sesión local:", e);
        }
      } else {
        await cargarDesdeAspirantesAdmision();
      }
    }
  });
}


// =========================================================================
// LÓGICA GENERAL DE LA INTERFAZ DE USUARIO (DOM)
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {

  // 1. Inicializar los iconos de Lucide
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 2. Inicializar observador de Firebase Auth y carga de datos
  gestionarEstadoPerfil();

  // 3. Menú Responsive (Móvil)
  const menuToggleBtn = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggleBtn && navLinks) {
    menuToggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // 4. Cerrar Sesión
  const btnCerrarSesion = document.getElementById('btnCerrarSesion');
  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', () => {
      if (confirm('¿Deseas cerrar sesión?')) {
        cerrarSesion();
      }
    });
  }

  // 5. Formulario de Actualización de Perfil (Modal/Perfil)
  const editProfileForm = document.getElementById('editProfileForm');
  if (editProfileForm) {
    editProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      const btnSave = document.getElementById('btnSaveData');

      const updateData = {
        nombre: document.getElementById('editNombre')?.value || '',
        primerApellido: document.getElementById('editApellido1')?.value || '',
        segundoApellido: document.getElementById('editApellido2')?.value || '',
        telefono: document.getElementById('editTelefono')?.value || '',
        telefonoTutor: document.getElementById('editTelTutor')?.value || ''
      };

      if (btnSave) btnSave.textContent = 'Guardando...';

      try {
        if (user) {
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, updateData);
        }
        
        aplicarDatosEnDOM(updateData, user?.uid || '');

        const editModal = document.getElementById('editModal');
        if (editModal) editModal.classList.remove('active');

        alert('¡Información actualizada correctamente!');
      } catch (error) {
        console.error("Error al actualizar el perfil:", error);
        alert('Ocurrió un error al intentar guardar los cambios.');
      } finally {
        if (btnSave) btnSave.textContent = 'Guardar Cambios';
      }
    });
  }

});

export { registrarAlumno, iniciarSesion, cerrarSesion };