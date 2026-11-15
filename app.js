(() => {
  'use strict';
  const KEY = 'daylist.tasks.v1';
  const ALERT_KEY = 'daylist.alerts.v1';
  const $ = (id) => document.getElementById(id);
  const dateToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const nextDay = (date, days) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate()+days);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const dateObject = (value) => new Date(`${value}T12:00:00`);
  const formatDate = (value) => dateObject(value).toLocaleDateString(undefined, {day:'numeric',month:'short',year:'numeric'});
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const validDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(dateObject(value).getTime()) && dateObject(value).toISOString().slice(0,10) === value;
  const status = (task) => task.progress === 100 ? 'done' : task.progress > 0 ? 'in_progress' : 'todo';
  const overdue = (task) => task.progress < 100 && task.due < dateToday();
  const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let tasks = [];
  let activeFilter = 'all';
  let editingId = null;
  let noticeTimeout;
  let bannerDismissedFor = '';

  function readTasks() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(data) ? data.filter(isValidTask) : [];
    } catch { return []; }
  }
  function isValidTask(task) {
    return task && typeof task.id === 'string' && typeof task.title === 'string' && task.title.trim().length > 0 && task.title.length <= 120 && validDate(task.due) && (!task.start || validDate(task.start)) && Number.isFinite(task.progress) && task.progress >= 0 && task.progress <= 100 && ['low','medium','high'].includes(task.priority);
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(tasks)); return true; }
    catch { showNotice('Could not save tasks. Check your browser storage settings.'); return false; }
  }
  function showNotice(message) {
    const el = $('notice');
    el.textContent = message; el.hidden = false;
    clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => { el.hidden = true; }, 6000);
  }
  function setFilter(value) {
    activeFilter = value;
    document.querySelectorAll('[data-filter]').forEach((button) => {
      button.classList.toggle('active', button.classList.contains('filter-tab') && button.dataset.filter === value);
      button.classList.toggle('selected', button.classList.contains('nav-link') && button.dataset.filter === value);
    });
    render();
  }
  function taskMatches(task) {
    if (activeFilter === 'overdue') return overdue(task);
    if (activeFilter !== 'all' && status(task) !== activeFilter) return false;
    return true;
  }
  function sortedTasks(list) {
    const mode = $('sort').value;
    const priorities = {high:0,medium:1,low:2};
    return [...list].sort((a,b) => {
      if (mode === 'priority') return priorities[a.priority] - priorities[b.priority] || a.due.localeCompare(b.due);
      if (mode === 'created') return (b.created || '').localeCompare(a.created || '');
      return a.due.localeCompare(b.due) || priorities[a.priority] - priorities[b.priority];
    });
  }
  function render() {
    const done = tasks.filter(t => t.progress === 100).length;
    const inProgress = tasks.filter(t => t.progress > 0 && t.progress < 100).length;
    const late = tasks.filter(overdue).length;
    const avg = tasks.length ? Math.round(tasks.reduce((sum,t) => sum + t.progress, 0)/tasks.length) : 0;
    $('metric-total').textContent = tasks.length;
    $('metric-progress').textContent = inProgress;
    $('metric-done').textContent = done;
    $('metric-overdue').textContent = late;
    $('nav-total').textContent = tasks.length;
    $('nav-overdue').textContent = late;
    $('nav-overdue').hidden = late === 0;
    $('progress-number').textContent = `${avg}%`;
    $('progress-ring').style.background = `conic-gradient(#6c5cdb ${avg}%, #f0eff6 ${avg}%)`;
    $('legend-done').textContent = done;
    $('legend-open').textContent = tasks.length - done;

    const query = $('search').value.trim().toLowerCase();
    const visible = sortedTasks(tasks.filter(t => taskMatches(t) && `${t.title} ${t.description || ''}`.toLowerCase().includes(query)));
    $('task-list').innerHTML = visible.length ? visible.map(taskMarkup).join('') : `<div class="empty-state"><div class="empty-illustration">✓</div><strong>${tasks.length ? 'Nothing matches this view' : 'A fresh start!'}</strong><p>${tasks.length ? 'Try another filter or search term.' : 'Add your first task to get things moving.'}</p><button class="btn btn-primary" data-action="new">＋ New task</button></div>`;

    const upcoming = [...tasks].filter(t => t.progress < 100).sort((a,b) => a.due.localeCompare(b.due)).slice(0,4);
    $('upcoming-list').innerHTML = upcoming.length ? upcoming.map(t => `<div class="upcoming-row"><div class="date-box"><strong>${dateObject(t.due).getDate()}</strong><span>${dateObject(t.due).toLocaleDateString(undefined,{month:'short'})}</span></div><div class="upcoming-info"><strong>${escapeHtml(t.title)}</strong><span class="${overdue(t)?'overdue-text':''}">${overdue(t)?'Overdue':t.due===dateToday()?'Due today':`Due ${formatDate(t.due)}`}</span></div></div>`).join('') : `<p class="empty-small">No pending deadlines. Add a task to see it here.</p>`;
    renderAlerts();
  }
  function taskMarkup(task) {
    const state = status(task);
    const late = overdue(task);
    return `<article class="task-row ${state === 'done' ? 'done' : ''}" data-id="${escapeHtml(task.id)}">
      <button class="complete-toggle ${state==='done'?'is-done':''}" data-action="toggle" data-id="${escapeHtml(task.id)}" title="${state==='done'?'Reopen task':'Complete task'}" aria-label="${state==='done'?'Reopen':'Complete'} ${escapeHtml(task.title)}">✓</button>
      <div class="task-content"><button class="task-name" data-action="edit" data-id="${escapeHtml(task.id)}">${escapeHtml(task.title)}</button>${task.description?`<p class="task-description">${escapeHtml(task.description)}</p>`:''}
        <div class="task-meta"><span class="priority ${task.priority}"><i></i>${task.priority} priority</span>${task.start?`<span>Starts ${formatDate(task.start)}</span>`:''}<span class="${late?'overdue-text':''}">${late?'⚑ Overdue':'▦ Due'} ${formatDate(task.due)}</span></div>
        <div class="task-progress"><div class="mini-track"><div style="width:${task.progress}%"></div></div><span>${task.progress}%</span></div>
      </div><div class="task-actions"><select class="task-status" data-action="status" data-id="${escapeHtml(task.id)}" aria-label="Status for ${escapeHtml(task.title)}"><option value="todo" ${state==='todo'?'selected':''}>To do</option><option value="in_progress" ${state==='in_progress'?'selected':''}>In progress</option><option value="done" ${state==='done'?'selected':''}>Done</option></select><div><button class="icon-btn" data-action="edit" data-id="${escapeHtml(task.id)}" title="Edit task" aria-label="Edit ${escapeHtml(task.title)}">✎</button><button class="icon-btn delete" data-action="delete" data-id="${escapeHtml(task.id)}" title="Delete task" aria-label="Delete ${escapeHtml(task.title)}">×</button></div></div></article>`;
  }
  function renderAlerts() {
    const late = tasks.filter(overdue).length;
    const todayDue = tasks.filter(t => t.progress < 100 && t.due === dateToday()).length;
    const tomorrowDue = tasks.filter(t => t.progress < 100 && t.due === nextDay(dateToday(),1)).length;
    const signature = `${dateToday()}:${late}:${todayDue}:${tomorrowDue}`;
    const banner = $('alert-banner');
    banner.hidden = (!late && !todayDue && !tomorrowDue) || bannerDismissedFor === signature;
    if (!banner.hidden) {
      $('alert-heading').textContent = late ? `${late} overdue task${late===1?'':'s'} need attention` : 'Upcoming deadlines';
      const parts = [];
      if (late) parts.push(`${late} overdue`);
      if (todayDue) parts.push(`${todayDue} due today`);
      if (tomorrowDue) parts.push(`${tomorrowDue} due tomorrow`);
      $('alert-description').textContent = parts.join(' · ');
    }
    banner.dataset.signature = signature;
  }
  function openDialog(task) {
    editingId = task?.id || null;
    $('dialog-title').textContent = task ? 'Edit task' : 'Add a new task';
    $('save-task').textContent = task ? 'Save changes' : 'Create task';
    $('task-title').value = task?.title || '';
    $('task-description').value = task?.description || '';
    $('task-start').value = task?.start || dateToday();
    $('task-due').value = task?.due || dateToday();
    $('task-priority').value = task?.priority || 'medium';
    $('task-percent').value = task?.progress ?? 0;
    $('progress-value').textContent = `${$('task-percent').value}%`;
    $('task-dialog').showModal();
    $('task-title').focus();
  }
  function closeDialog() { $('task-dialog').close(); }
  function saveTask(event) {
    event.preventDefault();
    const title = $('task-title').value.trim();
    const start = $('task-start').value;
    const due = $('task-due').value;
    if (!title || title.length > 120) return showNotice('Please enter a task name (up to 120 characters).');
    if (!validDate(due) || (start && !validDate(start))) return showNotice('Please enter valid dates.');
    if (start && due < start) return showNotice('The due date must be on or after the start date.');
    const old = tasks.find(t => t.id === editingId);
    const task = {
      id: old?.id || newId(), title, description: $('task-description').value.trim(),
      start, due, priority: $('task-priority').value,
      progress: Number($('task-percent').value),
      created: old?.created || new Date().toISOString()
    };
    if (old) tasks = tasks.map(t => t.id === old.id ? task : t);
    else tasks.unshift(task);
    persist(); closeDialog(); render(); checkNotifications();
    showNotice(old ? 'Task updated.' : 'Task created.');
  }
  function updateTask(id, action, value) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    if (action === 'edit') return openDialog(task);
    if (action === 'delete') {
      if (!confirm(`Delete "${task.title}"?`)) return;
      tasks = tasks.filter(t => t.id !== id);
    } else if (action === 'toggle') task.progress = task.progress === 100 ? 0 : 100;
    else if (action === 'status') task.progress = value === 'done' ? 100 : value === 'in_progress' ? (task.progress > 0 && task.progress < 100 ? task.progress : 50) : 0;
    persist(); render();
  }
  async function enableNotifications() {
    if (!('Notification' in window)) return showNotice('This browser does not support notifications. In-app deadline alerts still work.');
    if (!window.isSecureContext) return showNotice('Browser notifications require HTTPS or localhost. Vercel uses HTTPS.');
    try {
      const permission = await Notification.requestPermission();
      $('notification-label').textContent = permission === 'granted' ? 'Browser alerts enabled' : 'Enable browser alerts';
      if (permission === 'granted') { showNotice('Alerts enabled. Keep the app open to receive deadline reminders.'); checkNotifications(); }
      else showNotice('Notification permission was not granted. You will still see in-app deadline alerts.');
    } catch { showNotice('Could not enable notifications in this browser.'); }
  }
  function checkNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    let notified = {};
    try { notified = JSON.parse(localStorage.getItem(ALERT_KEY) || '{}'); } catch { notified = {}; }
    const today = dateToday();
    const tomorrow = nextDay(today,1);
    let changed = false;
    for (const task of tasks) {
      if (task.progress === 100 || task.due > tomorrow) continue;
      const key = `${task.id}:${today}:${task.due}`;
      if (notified[key]) continue;
      try {
        const when = task.due < today ? 'overdue' : task.due === today ? 'due today' : 'due tomorrow';
        new Notification(`Task ${when}`, {body:task.title, tag:`daylist-${task.id}-${today}`});
        notified[key] = true; changed = true;
      } catch { break; }
    }
    if (changed) {
      const recent = Object.entries(notified).filter(([key]) => key.includes(`:${today}:`));
      try { localStorage.setItem(ALERT_KEY, JSON.stringify(Object.fromEntries(recent))); } catch {}
    }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify({app:'daylist',version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `daylist-backup-${dateToday()}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url),1000);
    showNotice('Backup exported. Save this file somewhere safe.');
  }
  async function importData(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 5_000_000) return showNotice('Backup is too large (maximum 5 MB).');
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed.app !== 'daylist' || parsed.version !== 1 || !Array.isArray(parsed.tasks) || !parsed.tasks.every(isValidTask)) throw Error('Invalid backup');
      if (!confirm(`Import ${parsed.tasks.length} tasks? This will replace your current ${tasks.length} tasks.`)) return;
      tasks = parsed.tasks.map(t => ({id:t.id,title:t.title,description:String(t.description||'').slice(0,1000),start:t.start||'',due:t.due,priority:t.priority,progress:t.progress,created:typeof t.created==='string'?t.created:new Date().toISOString()}));
      persist(); setFilter('all'); showNotice('Backup imported successfully.');
    } catch { showNotice('This file is not a valid Daylist backup.'); }
  }
  function init() {
    tasks = readTasks();
    $('current-date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}).toUpperCase();
    document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click',() => setFilter(button.dataset.filter)));
    $('new-task-top').addEventListener('click',() => openDialog());
    $('new-task-inline').addEventListener('click',() => openDialog());
    $('close-dialog').addEventListener('click',closeDialog);
    $('cancel-task').addEventListener('click',closeDialog);
    $('task-form').addEventListener('submit',saveTask);
    $('task-percent').addEventListener('input',() => $('progress-value').textContent = `${$('task-percent').value}%`);
    $('search').addEventListener('input',render);
    $('sort').addEventListener('change',render);
    $('task-list').addEventListener('click',(event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'new') return openDialog();
      updateTask(button.dataset.id,button.dataset.action);
    });
    $('task-list').addEventListener('change',(event) => {
      if (event.target.matches('select[data-action="status"]')) updateTask(event.target.dataset.id,'status',event.target.value);
    });
    $('dismiss-alert').addEventListener('click',() => {bannerDismissedFor = $('alert-banner').dataset.signature; renderAlerts();});
    $('enable-notifications').addEventListener('click',enableNotifications);
    $('export-data').addEventListener('click',exportData);
    $('import-data').addEventListener('click',() => $('import-file').click());
    $('import-file').addEventListener('change',importData);
    if ('Notification' in window && Notification.permission === 'granted') $('notification-label').textContent = 'Browser alerts enabled';
    render(); checkNotifications();
    setInterval(() => {render();checkNotifications();},60_000);
    document.addEventListener('visibilitychange',() => {if (!document.hidden) {render();checkNotifications();}});
  }
  init();
})();
