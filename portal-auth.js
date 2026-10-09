import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyC64X_uSvL_Sn1WQLw7ZV9QDme2aOfV5ag',
  authDomain: 'docere-931ec.firebaseapp.com',
  projectId: 'docere-931ec',
  storageBucket: 'docere-931ec.firebasestorage.app',
  messagingSenderId: '1005663843239',
  appId: '1:1005663843239:web:d8f6c7524a5d10bf797c82',
  measurementId: 'G-B6TDT4VE7S'
};

const authAppName = 'docerePortalAuth';
export const authApp = getApps().find((app) => app.name === authAppName)
  || initializeApp(firebaseConfig, authAppName);
export const auth = getAuth(authApp);

export async function authenticatePortalUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    return await signInWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    if (!['auth/user-not-found', 'auth/invalid-credential'].includes(error.code)) throw error;
  }

  try {
    return await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    return signInWithEmailAndPassword(auth, normalizedEmail, password);
  }
}

export function signOutPortalUser() {
  return signOut(auth);
}
