import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { addDoc, collection, getFirestore, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
