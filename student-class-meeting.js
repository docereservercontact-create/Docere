import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

function studentMatchesClassroom(classroom, student) {
  const email = String(student.email || '').trim().toLowerCase();
  return Array.isArray(classroom.alumnos) && classroom.alumnos.some((assignedStudent) => {
    const assignedEmail = String(assignedStudent.email || assignedStudent.correo || '').trim().toLowerCase();
    return (String(assignedStudent.id) === String(student.id)
      && assignedStudent.coleccion === student.coleccion)
      || (email && assignedEmail === email);
  });
}

function getMeetingUrl(classroom) {
  try {
    const url = new URL(String(classroom.enlaceClase || '').trim());
    const isGoogleMeet = url.hostname === 'meet.google.com';
    const isZoom = url.hostname === 'zoom.us' || url.hostname.endsWith('.zoom.us');
    return url.protocol === 'https:' && (isGoogleMeet || isZoom) && url.pathname !== '/'
      ? url.href
      : '';
  } catch {
    return '';
  }
}

function createClassroomPicker() {
  const dialog = document.createElement('dialog');
  dialog.className = 'student-class-meeting-dialog';
  dialog.setAttribute('aria-labelledby', 'studentClassMeetingTitle');
  const style = document.createElement('style');
  style.textContent = `
    .student-class-meeting-dialog { width: min(92vw, 480px); max-height: 80vh; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; color: #0f172a; box-shadow: 0 20px 50px rgba(15, 23, 42, .25); }
    .student-class-meeting-dialog::backdrop { background: rgba(15, 23, 42, .55); }
    .student-class-meeting-dialog h2 { margin: 0 0 8px; font: 700 1.25rem system-ui, sans-serif; }
    .student-class-meeting-dialog p { margin: 0 0 16px; color: #475569; font: 14px system-ui, sans-serif; }
    .student-class-meeting-options { display: grid; gap: 10px; }
    .student-class-meeting-option { display: grid; gap: 3px; width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #0f172a; text-align: left; font: 14px system-ui, sans-serif; cursor: pointer; }
    .student-class-meeting-option:hover:not(:disabled) { border-color: #2563eb; background: #eff6ff; }
    .student-class-meeting-option:disabled { color: #64748b; cursor: not-allowed; opacity: .75; }
    .student-class-meeting-option span { color: #475569; font-size: 13px; }
    .student-class-meeting-close { min-height: 38px; margin-top: 16px; padding: 0 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #0f172a; font: 14px system-ui, sans-serif; cursor: pointer; }
  `;
  const title = document.createElement('h2');
  title.id = 'studentClassMeetingTitle';
  title.textContent = 'Elige tu aula';
  const description = document.createElement('p');
  description.textContent = 'Selecciona la clase a la que deseas entrar.';
  const options = document.createElement('div');
  options.className = 'student-class-meeting-options';
  const closeButton = document.createElement('button');
  closeButton.className = 'student-class-meeting-close';
  closeButton.type = 'button';
  closeButton.textContent = 'Cerrar';
  closeButton.addEventListener('click', () => dialog.close());
  dialog.append(title, description, options, closeButton);
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.head.append(style);
  document.body.append(dialog);
  return { dialog, options };
}

function openMeeting(url, reservedWindow = null) {
  if (reservedWindow) {
    reservedWindow.opener = null;
    reservedWindow.location.href = url;
    return;
  }
  const meetingWindow = window.open(url, '_blank');
  if (meetingWindow) meetingWindow.opener = null;
  else window.location.assign(url);
}

export function bindStudentClassMeetingButton({
  button,
  db,
  getStudentAbsenceStatus,
  getSuspensionMessage,
  beforeOpen = async () => true
}) {
  const { dialog, options } = createClassroomPicker();

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    const reservedWindow = window.open('about:blank', '_blank');
    try {
      const student = JSON.parse(localStorage.getItem('studentSession') || 'null');
      const absenceStatus = await getStudentAbsenceStatus(student);
      if (absenceStatus.isSuspended) {
        reservedWindow?.close();
        alert(getSuspensionMessage(absenceStatus));
        return;
      }
      if (!await beforeOpen(student)) {
        reservedWindow?.close();
        return;
      }
      if (!student?.id || !student?.coleccion) {
        reservedWindow?.close();
        alert('No se pudo identificar tu inscripción. Cierra sesión y vuelve a ingresar.');
        return;
      }

      const snapshot = await getDocs(collection(db, 'Aulas'));
      const classrooms = snapshot.docs
        .map((classroomDoc) => ({ id: classroomDoc.id, ...classroomDoc.data() }))
        .filter((classroom) => studentMatchesClassroom(classroom, student));
      if (!classrooms.length) {
        reservedWindow?.close();
        alert('No tienes aulas asignadas. Pide al profesor o al administrador que revise tu inscripción.');
        return;
      }

      if (classrooms.length === 1) {
        const meetingUrl = getMeetingUrl(classrooms[0]);
        if (!meetingUrl) {
          reservedWindow?.close();
          alert('El profesor aún no ha asignado un enlace de reunión válido a tu aula.');
          return;
        }
        openMeeting(meetingUrl, reservedWindow);
        return;
      }

      reservedWindow?.close();
      options.replaceChildren();
      classrooms.forEach((classroom) => {
        const meetingUrl = getMeetingUrl(classroom);
        const option = document.createElement('button');
        option.className = 'student-class-meeting-option';
        option.type = 'button';
        option.disabled = !meetingUrl;
        const name = document.createElement('strong');
        name.textContent = classroom.nombre || 'Aula sin nombre';
        const course = document.createElement('span');
        course.textContent = meetingUrl
          ? classroom.curso || 'Curso sin especificar'
          : 'El profesor aún no ha asignado un enlace de reunión válido';
        option.append(name, course);
        if (meetingUrl) {
          option.addEventListener('click', () => {
            dialog.close();
            openMeeting(meetingUrl);
          });
        }
        options.append(option);
      });
      dialog.showModal();
    } catch (error) {
      console.error('No se pudo consultar el enlace de Google Meet del aula:', error);
      reservedWindow?.close();
      alert('No se pudo cargar el enlace de tu aula. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  });
}
