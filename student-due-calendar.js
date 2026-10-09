export function createStudentDueCalendar(container, onTaskSelect = null) {
  const calendar = document.createElement('section');
  calendar.className = 'student-due-calendar';
  calendar.setAttribute('aria-labelledby', 'studentDueCalendarTitle');
  const header = document.createElement('header');
  header.className = 'student-due-calendar-header';
  const title = document.createElement('h2');
  title.id = 'studentDueCalendarTitle';
  title.textContent = 'Calendario de entregas';
  const monthNav = document.createElement('div');
  monthNav.className = 'student-due-calendar-month-nav';
  const previousButton = document.createElement('button');
  previousButton.className = 'student-due-calendar-nav';
  previousButton.type = 'button';
  previousButton.setAttribute('aria-label', 'Mes anterior');
  previousButton.textContent = '‹';
  const monthLabel = document.createElement('span');
  monthLabel.className = 'student-due-calendar-month';
  const nextButton = document.createElement('button');
  nextButton.className = 'student-due-calendar-nav';
  nextButton.type = 'button';
  nextButton.setAttribute('aria-label', 'Mes siguiente');
  nextButton.textContent = '›';
  monthNav.append(previousButton, monthLabel, nextButton);
  header.append(title, monthNav);
  const grid = document.createElement('div');
  grid.className = 'student-due-calendar-grid';
  grid.setAttribute('role', 'grid');
  grid.setAttribute('aria-label', 'Fechas de entrega');
  const details = document.createElement('div');
  details.className = 'student-due-calendar-details';
  details.setAttribute('role', 'status');
  details.setAttribute('aria-live', 'polite');
  calendar.append(header, grid, details);
  container.replaceChildren(calendar);

  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let tasks = [];
  let selectedDate = new Date();

  function dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getDeadlineDate(value) {
    if (!value) return null;
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
  }

  function renderDayDetails(date, dayTasks) {
    selectedDate = date;
    details.replaceChildren();
    const formattedDate = formatDate(date);
    const heading = document.createElement('p');
    heading.textContent = formattedDate;
    details.append(heading);
    if (!dayTasks.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = 'No tienes asignaciones con entrega este día.';
      details.append(emptyMessage);
      return;
    }

    const taskList = document.createElement('div');
    taskList.className = 'student-due-calendar-task-list';
    dayTasks.forEach((task) => {
      const taskTitle = document.createElement(onTaskSelect ? 'button' : 'span');
      taskTitle.className = onTaskSelect ? 'student-due-calendar-task' : 'student-due-calendar-task-label';
      taskTitle.textContent = task.titulo || 'Asignación';
      if (onTaskSelect) {
        taskTitle.type = 'button';
        taskTitle.addEventListener('click', () => onTaskSelect(task));
      }
      taskList.append(taskTitle);
      const taskMeta = document.createElement('span');
      taskMeta.className = 'student-due-calendar-task-meta';
      taskMeta.textContent = `${task.tema || task.curso || 'Materia'}${task.aulaNombre ? ` · ${task.aulaNombre}` : ''}`;
      taskList.append(taskMeta);
    });
    details.append(taskList);
  }

  function render() {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    monthLabel.textContent = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(month);
    grid.replaceChildren();
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((weekday) => {
      const label = document.createElement('span');
      label.className = 'student-due-calendar-weekday';
      label.setAttribute('role', 'columnheader');
      label.textContent = weekday;
      grid.append(label);
    });

    const tasksByDate = new Map();
    tasks.forEach((task) => {
      const deadline = getDeadlineDate(task.fechaEntrega);
      if (!deadline) return;
      const key = dateKey(deadline);
      if (!tasksByDate.has(key)) tasksByDate.set(key, []);
      tasksByDate.get(key).push(task);
    });

    const firstDate = new Date(year, monthIndex, 1);
    const mondayOffset = (firstDate.getDay() + 6) % 7;
    const todayKey = dateKey(new Date());
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(year, monthIndex, 1 - mondayOffset + index);
      const key = dateKey(date);
      const dayTasks = tasksByDate.get(key) || [];
      const cell = document.createElement('div');
      cell.className = 'student-due-calendar-cell';
      cell.setAttribute('role', 'gridcell');
      const dayButton = document.createElement('button');
      dayButton.className = 'student-due-calendar-day';
      dayButton.type = 'button';
      dayButton.textContent = String(date.getDate());
      dayButton.setAttribute('aria-label', `${formatDate(date)}${dayTasks.length ? `, ${dayTasks.length} asignación(es)` : ''}`);
      if (date.getMonth() !== monthIndex) dayButton.classList.add('student-due-calendar-day--outside');
      if (key === todayKey) dayButton.classList.add('student-due-calendar-day--today');
      if (dayTasks.length) {
        dayButton.classList.add('student-due-calendar-day--has-tasks');
        const count = document.createElement('span');
        count.className = 'student-due-calendar-day-count';
        count.textContent = String(dayTasks.length);
        dayButton.append(count);
      }
      dayButton.addEventListener('pointerenter', () => renderDayDetails(date, dayTasks));
      dayButton.addEventListener('focus', () => renderDayDetails(date, dayTasks));
      dayButton.addEventListener('click', () => renderDayDetails(date, dayTasks));
      cell.append(dayButton);
      grid.append(cell);
    }

    const selectedTasks = tasksByDate.get(dateKey(selectedDate)) || [];
    renderDayDetails(selectedDate, selectedTasks);
  }

  previousButton.addEventListener('click', () => {
    month = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    render();
  });
  nextButton.addEventListener('click', () => {
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    render();
  });

  render();
  return {
    setTasks(nextTasks) {
      tasks = Array.isArray(nextTasks) ? nextTasks : [];
      render();
    }
  };
}
