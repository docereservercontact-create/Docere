import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { collection, getDocs, getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC64X_uSvL_Sn1WQLw7ZV9QDme2aOfV5ag',
  authDomain: 'docere-931ec.firebaseapp.com',
  projectId: 'docere-931ec',
  storageBucket: 'docere-931ec.firebasestorage.app',
  messagingSenderId: '1005663843239',
  appId: '1:1005663843239:web:d8f6c7524a5d10bf797c82',
  measurementId: 'G-B6TDT4VE7S'
};

const appName = 'studentAccess';
const app = getApps().find((firebaseApp) => firebaseApp.name === appName)
  || initializeApp(firebaseConfig, appName);
const db = getFirestore(app);

export const ABSENCE_SUSPENSION_PERCENT = 20;

function studentMatchesClassroom(classroom, student) {
  return Array.isArray(classroom.alumnos) && classroom.alumnos.some((assignedStudent) =>
    (assignedStudent.id === student.id && assignedStudent.coleccion === student.coleccion)
    || (student.email && assignedStudent.email === student.email)
  );
}

function getAttendanceState(record) {
  if (['asistencia', 'falta', 'retardo'].includes(record.estado)) return record.estado;
  return record.presente === true ? 'asistencia' : 'falta';
}

export async function getStudentAbsenceStatus(student) {
  if (!student?.id || !student?.coleccion) throw new Error('No se pudo identificar la sesión del alumno.');

  const classroomSnapshot = await getDocs(collection(db, 'Aulas'));
  const classrooms = classroomSnapshot.docs
    .map((classroomDoc) => ({ id: classroomDoc.id, ...classroomDoc.data() }))
    .filter((classroom) => studentMatchesClassroom(classroom, student));
  const attendanceResults = await Promise.all(classrooms.map(async (classroom) => {
    const snapshot = await getDocs(collection(db, 'Aulas', classroom.id, 'asistencias'));
    return snapshot.docs.map((attendanceDoc) => {
      const attendance = attendanceDoc.data();
      return (Array.isArray(attendance.alumnos) ? attendance.alumnos : []).find((record) =>
        (record.id === student.id && record.coleccion === student.coleccion)
        || (student.email && record.email === student.email)
      );
    }).filter(Boolean);
  }));

  const records = attendanceResults.flat();
  const absences = records.filter((record) => getAttendanceState(record) === 'falta').length;
  const total = records.length;
  return {
    absences,
    total,
    percent: total ? (absences / total) * 100 : 0,
    isSuspended: total > 0 && absences * 5 >= total
  };
}

export function getSuspensionMessage(status) {
  return `Tu acceso está suspendido por registrar ${status.percent.toFixed(1)}% de faltas (límite: ${ABSENCE_SUSPENSION_PERCENT}%). Solo puedes consultar el análisis en Mis Cursos. Comunícate con tu profesor asignado o con un asesor.`;
}