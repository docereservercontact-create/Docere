import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyC64X_uSvL_Sn1WQLw7ZV9QDme2aOfV5ag',
  authDomain: 'docere-931ec.firebaseapp.com',
  projectId: 'docere-931ec',
  storageBucket: 'docere-931ec.firebasestorage.app',
  messagingSenderId: '1005663843239',
  appId: '1:1005663843239:web:d8f6c7524a5d10bf797c82',
  measurementId: 'G-B6TDT4VE7S'
};

const app = getApps().find((firebaseApp) => firebaseApp.name === 'studentNotifications')
  || initializeApp(firebaseConfig, 'studentNotifications');
const db = getFirestore(app);

function getStudentNotificationKey(student) {
  return `${encodeURIComponent(student.coleccion || 'users')}_${encodeURIComponent(student.id || student.email || 'student')}`;
}

function isStudentInClassroom(classroom, student) {
  if (!Array.isArray(classroom.alumnos)) return false;
  const email = String(student.email || '').trim().toLowerCase();
  return classroom.alumnos.some((assignedStudent) =>
    (assignedStudent.id === student.id && assignedStudent.coleccion === student.coleccion)
    || (email && String(assignedStudent.email || assignedStudent.correo || '').trim().toLowerCase() === email)
  );
}

function isTaskAssignedToStudent(task, student) {
  if (!Array.isArray(task.alumnosAsignados)) return true;
  const email = String(student.email || '').trim().toLowerCase();
  return task.alumnosAsignados.some((assignedStudent) =>
    (assignedStudent.id === student.id && assignedStudent.coleccion === student.coleccion)
    || (email && String(assignedStudent.email || assignedStudent.correo || '').trim().toLowerCase() === email)
  );
}

function getDate(value) {
  if (!value) return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEventDateTime(event) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event.fecha || '') || !/^\d{2}:\d{2}$/.test(event.hora || '')) return null;
  const date = new Date(`${event.fecha}T${event.hora}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getFormattedDateTime(date) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

async function createNotificationOnce(student, notificationId, notification) {
  const notificationRef = doc(db, 'Notificaciones', getStudentNotificationKey(student), 'items', notificationId);
  await runTransaction(db, async (transaction) => {
    const existingNotification = await transaction.get(notificationRef);
    if (existingNotification.exists()) return;
    transaction.set(notificationRef, {
      ...notification,
      estudianteId: student.id,
      estudianteColeccion: student.coleccion,
      leida: false,
      creadoEn: serverTimestamp()
    });
  });
}

function routeNotification(notification) {
  const taskTypes = ['tarea', 'recordatorio_tarea', 'calificacion', 'comentario'];
  if (taskTypes.includes(notification.tipo)) {
    window.location.href = `asignaciones.html#assignment-${encodeURIComponent(notification.id)}`;
  } else if (notification.tipo === 'pizarra') {
    window.location.href = 'Apuntes_admision.html';
  } else if (notification.tipo === 'pago') {
    window.location.href = 'panel_estudiante.html#pagos';
  } else if (notification.tipo === 'evento' || notification.tipo === 'recordatorio_evento') {
    window.location.href = `panel_estudiante.html#upcomingEventsList`;
  } else {
    window.location.href = 'panel_estudiante.html';
  }
}

function initializeNotificationBell(student) {
  const button = document.getElementById('studentNotificationButton');
  const panel = document.getElementById('studentNotificationPanel');
  const count = document.getElementById('studentNotificationCount');
  const list = document.getElementById('studentNotificationList');
  const markReadButton = document.getElementById('studentNotificationMarkRead');
  if (!button || !panel || !count || !list || !markReadButton) return;

  const toast = document.createElement('div');
  toast.className = 'notification-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.hidden = true;
  document.body.append(toast);

  let notifications = [];
  let initialSnapshot = true;
  let toastTimer;

  function showToast(notification) {
    toast.textContent = `${notification.tipoTexto || 'Nueva notificación'}: ${notification.titulo || 'Actividad'}${notification.aulaNombre ? ` · ${notification.aulaNombre}` : ''}`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
  }

  function renderNotifications() {
    list.replaceChildren();
    if (!notifications.length) {
      const empty = document.createElement('p');
      empty.className = 'notification-empty';
      empty.textContent = 'Aún no tienes notificaciones.';
      list.append(empty);
      count.hidden = true;
      return;
    }

    notifications.forEach((notification) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `notification-item ${notification.leida ? 'is-read' : 'is-unread'}`;
      const title = document.createElement('strong');
      title.textContent = notification.titulo || 'Nueva actividad';
      const context = document.createElement('span');
      context.textContent = `${notification.tipoTexto || 'Notificación'}${notification.aulaNombre ? ` · ${notification.aulaNombre}` : ''}`;
      item.append(title, context);
      if (notification.detalle) {
        const detail = document.createElement('span');
        detail.textContent = notification.detalle;
        item.append(detail);
      }
      const state = document.createElement('span');
      state.className = 'notification-read-state';
      state.textContent = notification.leida ? 'Leída' : 'No leída';
      item.append(state);
      item.addEventListener('click', async () => {
        if (!notification.leida) {
          try {
            await runTransaction(db, async (transaction) => {
              const notificationRef = doc(
                db,
                'Notificaciones',
                getStudentNotificationKey(student),
                'items',
                notification.notificationDocId
              );
              const snapshot = await transaction.get(notificationRef);
              if (snapshot.exists() && !snapshot.data().leida) {
                transaction.update(notificationRef, { leida: true, leidaEn: serverTimestamp() });
              }
            });
          } catch (error) {
            console.error(`No se pudo marcar como leída la notificación ${notification.notificationDocId}:`, error);
            showToast({ tipoTexto: 'Error', titulo: 'No se pudo guardar el estado leído.' });
            return;
          }
        }
        routeNotification(notification);
      });
      list.append(item);
    });

    const unreadCount = notifications.filter((notification) => !notification.leida).length;
    count.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    count.hidden = unreadCount === 0;
  }

  const unsubscribeNotifications = onSnapshot(
    collection(db, 'Notificaciones', getStudentNotificationKey(student), 'items'),
    (snapshot) => {
      notifications = snapshot.docs.map((notificationDoc) => ({
        notificationDocId: notificationDoc.id,
        ...notificationDoc.data()
      }));
      notifications.sort((left, right) =>
        (right.creadoEn?.toMillis?.() || 0) - (left.creadoEn?.toMillis?.() || 0)
      );
      renderNotifications();
      if (!initialSnapshot) {
        snapshot.docChanges().forEach((change) => {
          if (change.type !== 'added' && change.type !== 'modified') return;
          const notification = change.doc.data();
          if (!notification.leida) showToast(notification);
        });
      }
      initialSnapshot = false;
    },
    (error) => {
      console.error('No se pudo cargar el historial de notificaciones del alumno:', error);
      list.replaceChildren();
      const errorMessage = document.createElement('p');
      errorMessage.className = 'notification-empty';
      errorMessage.textContent = 'No se pudieron cargar las notificaciones.';
      list.append(errorMessage);
    }
  );

  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  });
  markReadButton.addEventListener('click', async () => {
    const unread = notifications.filter((notification) => !notification.leida);
    for (let offset = 0; offset < unread.length; offset += 450) {
      const batch = writeBatch(db);
      unread.slice(offset, offset + 450).forEach((notification) => {
        batch.update(
          doc(db, 'Notificaciones', getStudentNotificationKey(student), 'items', notification.notificationDocId),
          { leida: true, leidaEn: serverTimestamp() }
        );
      });
      try {
        await batch.commit();
      } catch (error) {
        console.error('No se pudieron marcar como leídas todas las notificaciones:', error);
        showToast({ tipoTexto: 'Error', titulo: 'No se pudieron marcar todas como leídas.' });
        return;
      }
    }
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.notification-wrapper')) {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
  });
  window.addEventListener('pagehide', unsubscribeNotifications, { once: true });
}

function startReminderScheduler(student) {
  const classroomListeners = new Map();
  let checkingReminders = false;

  async function checkReminders() {
    if (checkingReminders) return;
    checkingReminders = true;
    const now = Date.now();
    const notificationsToCreate = [];
    classroomListeners.forEach(({ aula, tasks, events }) => {
      tasks.forEach((task) => {
        if (!isTaskAssignedToStudent(task, student)) return;
        const deadline = getDate(task.fechaEntrega);
        if (!deadline) return;
        const remaining = deadline.getTime() - now;
        if (remaining <= -30 * 60 * 1000 || remaining > 30 * 60 * 1000) return;
        notificationsToCreate.push({
          id: `recordatorio_tarea_${encodeURIComponent(aula.id)}_${encodeURIComponent(task.id)}`,
          student,
          notification: {
            id: task.id,
            aulaId: aula.id,
            aulaNombre: aula.nombre || 'Aula',
            titulo: task.titulo || 'Tarea',
            detalle: `La fecha límite es ${getFormattedDateTime(deadline)}.`,
            tipo: 'recordatorio_tarea',
            tipoTexto: remaining > 0
              ? 'La entrega vence en menos de 30 minutos'
              : 'La fecha límite pasó hace menos de 30 minutos'
          }
        });
      });

      events.forEach((event) => {
        const eventStart = getEventDateTime(event);
        if (!eventStart) return;
        const remaining = eventStart.getTime() - now;
        if (remaining <= 0) return;
        const eventNotification = {
          id: event.id,
          aulaId: aula.id,
          aulaNombre: aula.nombre || 'Aula',
          titulo: event.titulo || 'Evento',
          detalle: `${getFormattedDateTime(eventStart)}${event.lugar ? ` · ${event.lugar}` : ''}`,
          fecha: event.fecha,
          hora: event.hora,
          lugar: event.lugar || '',
          descripcion: event.descripcion || '',
          tipo: 'recordatorio_evento'
        };
        if (remaining <= 24 * 60 * 60 * 1000 && remaining > 15 * 60 * 1000) {
          notificationsToCreate.push({
            id: `recordatorio_evento_dia_${encodeURIComponent(aula.id)}_${encodeURIComponent(event.id)}`,
            student,
            notification: { ...eventNotification, tipoTexto: 'Recordatorio: evento dentro de las próximas 24 horas' }
          });
        }
        if (remaining <= 15 * 60 * 1000) {
          notificationsToCreate.push({
            id: `recordatorio_evento_15min_${encodeURIComponent(aula.id)}_${encodeURIComponent(event.id)}`,
            student,
            notification: { ...eventNotification, tipoTexto: 'El evento comienza en 15 minutos' }
          });
        }
      });
    });

    try {
      const results = await Promise.allSettled(notificationsToCreate.map(({ id, notification }) =>
        createNotificationOnce(student, id, notification)
      ));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`No se pudo guardar un recordatorio del alumno (${notificationsToCreate[index].id}):`, result.reason);
        }
      });
    } finally {
      checkingReminders = false;
    }
  }

  const unsubscribeClassrooms = onSnapshot(
    collection(db, 'Aulas'),
    (snapshot) => {
      const matchingClassrooms = new Map(
        snapshot.docs
          .map((classroomDoc) => ({ id: classroomDoc.id, ...classroomDoc.data() }))
          .filter((classroom) => isStudentInClassroom(classroom, student))
          .map((classroom) => [classroom.id, classroom])
      );

      classroomListeners.forEach((entry, classroomId) => {
        if (matchingClassrooms.has(classroomId)) return;
        entry.unsubscribers.forEach((unsubscribe) => unsubscribe());
        classroomListeners.delete(classroomId);
      });

      matchingClassrooms.forEach((aula, classroomId) => {
        const existing = classroomListeners.get(classroomId);
        if (existing) {
          existing.aula = aula;
          return;
        }
        const entry = { aula, tasks: [], events: [], unsubscribers: [] };
        entry.unsubscribers.push(onSnapshot(
          collection(db, 'Aulas', classroomId, 'tareas'),
          (taskSnapshot) => {
            entry.tasks = taskSnapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() }));
            void checkReminders();
          },
          (error) => console.error(`No se pudieron revisar las tareas para recordatorios del aula ${classroomId}:`, error)
        ));
        entry.unsubscribers.push(onSnapshot(
          collection(db, 'Aulas', classroomId, 'publicaciones'),
          (eventSnapshot) => {
            entry.events = eventSnapshot.docs.map((eventDoc) => ({ id: eventDoc.id, ...eventDoc.data() }));
            void checkReminders();
          },
          (error) => console.error(`No se pudieron revisar los eventos para recordatorios del aula ${classroomId}:`, error)
        ));
        classroomListeners.set(classroomId, entry);
      });
      void checkReminders();
    },
    (error) => console.error('No se pudieron consultar las aulas para los recordatorios del alumno:', error)
  );

  const intervalId = window.setInterval(() => { void checkReminders(); }, 60 * 1000);
  window.addEventListener('pagehide', () => {
    window.clearInterval(intervalId);
    unsubscribeClassrooms();
    classroomListeners.forEach((entry) => entry.unsubscribers.forEach((unsubscribe) => unsubscribe()));
    classroomListeners.clear();
  }, { once: true });
}

export function initializeStudentNotifications() {
  const student = JSON.parse(localStorage.getItem('studentSession') || 'null');
  if (!student?.id || !student?.coleccion) return;
  const currentPage = window.location.pathname.split('/').pop() || 'panel_estudiante.html';
  if (currentPage !== 'panel_estudiante.html') initializeNotificationBell(student);
  startReminderScheduler(student);
}
