import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { addDoc, collection, doc, getFirestore, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC64X_uSvL_Sn1WQLw7ZV9QDme2aOfV5ag',
  authDomain: 'docere-931ec.firebaseapp.com',
  projectId: 'docere-931ec',
  storageBucket: 'docere-931ec.firebasestorage.app',
  messagingSenderId: '1005663843239',
  appId: '1:1005663843239:web:d8f6c7524a5d10bf797c82',
  measurementId: 'G-B6TDT4VE7S'
};

const appName = 'sessionAudit';
const app = getApps().find((firebaseApp) => firebaseApp.name === appName)
  || initializeApp(firebaseConfig, appName);
const db = getFirestore(app);

export async function logSessionEvent(session, event, role, reason = 'usuario') {
  if (!session || !['inicio_sesion', 'cierre_sesion'].includes(event)) return;

  try {
    await addDoc(collection(db, 'registro_sesiones'), {
      usuarioId: session.teacherDocId || session.id || session.uid || null,
      nombre: session.nombre || 'Sin nombre',
      correo: session.email || '',
      rol,
      evento: event,
      motivo: reason,
      fechaHora: serverTimestamp(),
      fechaCliente: new Date().toISOString()
    });
  } catch (error) {
    console.error('No se pudo guardar el registro de sesión:', error);
  }
}

export async function startStudentPageVisit(session, page) {
  if (!session?.id || !session?.coleccion || !page) {
    console.error('No se pudo iniciar el registro de actividad: faltan los datos de sesión del alumno o la página.');
    return null;
  }

  const visitRef = doc(collection(db, 'registro_actividad_alumno'));
  const visitId = visitRef.id;
  try {
    await setDoc(visitRef, {
      usuarioId: session.id,
      usuarioColeccion: session.coleccion,
      nombre: session.nombre || 'Sin nombre',
      correo: session.email || '',
      rol: 'alumno',
      evento: 'entrada_pagina',
      pagina: page,
      visitaId: visitId,
      fechaHora: serverTimestamp(),
      fechaCliente: new Date().toISOString(),
      duracionSegundos: 0
    });
  } catch (error) {
    console.error(`No se pudo registrar la entrada del alumno en ${page}:`, error);
    return null;
  }

  return {
    id: visitId,
    updateDuration: async (event, durationSeconds) => {
      try {
        await setDoc(visitRef, {
          evento: event,
          ultimoRegistro: serverTimestamp(),
          fechaClienteActualizacion: new Date().toISOString(),
          duracionSegundos: durationSeconds
        }, { merge: true });
      } catch (error) {
        console.error(`No se pudo actualizar la duración de la visita ${visitId}:`, error);
      }
    },
    recordClick: async (control, element) => {
      try {
        await addDoc(collection(db, 'registro_actividad_alumno'), {
          usuarioId: session.id,
          usuarioColeccion: session.coleccion,
          nombre: session.nombre || 'Sin nombre',
          correo: session.email || '',
          rol: 'alumno',
          evento: 'clic',
          pagina: page,
          visitaId: visitId,
          control,
          elemento: element,
          fechaHora: serverTimestamp(),
          fechaCliente: new Date().toISOString()
        });
      } catch (error) {
        console.error(`No se pudo registrar un clic del alumno en ${page}:`, error);
      }
    }
  };
}
