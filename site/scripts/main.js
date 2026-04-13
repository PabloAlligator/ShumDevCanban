const STORAGE_KEY = 'shumdev-kanban-tasks';
let deferredInstallPrompt = null;

const appState = {
    tasks: [],
    editingTaskId: null,
    draggedTaskId: null,
    filter: 'all',
    expandedColumns: {
        backlog: false,
        today: false,
        progress: false,
        done: false,
    },
    activeTag: null,
};

const statusMap = {
    backlog: {
        label: 'Backlog',
        containerId: 'backlogTasks',
        countId: 'backlogCount',
    },
    today: {
        label: 'Today',
        containerId: 'todayTasks',
        countId: 'todayCount',
    },
    progress: {
        label: 'In Progress',
        containerId: 'progressTasks',
        countId: 'progressCount',
    },
    done: {
        label: 'Done',
        containerId: 'doneTasks',
        countId: 'doneCount',
    },
};

const TASKS_PREVIEW_LIMIT = 3;

const priorityMap = {
    low: {
        label: 'Low',
        className: 'task-card__badge--low',
    },
    medium: {
        label: 'Medium',
        className: 'task-card__badge--medium',
    },
    high: {
        label: 'High',
        className: 'task-card__badge--high',
    },
};

const elements = {
    header: document.querySelector('.header'),
    burger: document.querySelector('.burger'),
    nav: document.querySelector('.nav'),

    taskModal: document.getElementById('taskModal'),
    taskModalOverlay: document.getElementById('taskModalOverlay'),
    closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
    deleteTaskBtn: document.getElementById('deleteTaskBtn'),
    taskForm: document.getElementById('taskForm'),
    taskModalTitle: document.getElementById('taskModalTitle'),

    installHelpModal: document.getElementById('installHelpModal'),
    installHelpOverlay: document.getElementById('installHelpOverlay'),
    closeInstallHelpBtn: document.getElementById('closeInstallHelpBtn'),
    installHelpOkBtn: document.getElementById('installHelpOkBtn'),

    taskIdInput: document.getElementById('taskId'),
    taskTitleInput: document.getElementById('taskTitle'),
    taskDescriptionInput: document.getElementById('taskDescription'),
    taskTagsInput: document.getElementById('taskTags'),
    taskPriorityInput: document.getElementById('taskPriority'),
    taskStatusInput: document.getElementById('taskStatus'),
    taskDueDateInput: document.getElementById('taskDueDate'),

    openTaskModalBtn: document.getElementById('openTaskModalBtn'),
    heroCreateTaskBtn: document.getElementById('heroCreateTaskBtn'),
    boardCreateTaskBtn: document.getElementById('boardCreateTaskBtn'),
    clearDoneBtn: document.getElementById('clearDoneBtn'),
    themeToggle: document.getElementById('themeToggle'),
    installAppBtn: document.getElementById('installAppBtn'),

    totalTasksCount: document.getElementById('totalTasksCount'),
    inProgressTasksCount: document.getElementById('inProgressTasksCount'),
    doneTasksCount: document.getElementById('doneTasksCount'),
    todayTasksCount: document.getElementById('todayTasksCount'),
    focusTaskText: document.getElementById('focusTaskText'),

    taskCardTemplate: document.getElementById('taskCardTemplate'),

    boardColumns: document.querySelectorAll('.board-column'),
    taskLists: document.querySelectorAll('.task-list'),
    emptyStates: document.querySelectorAll('.empty-state'),
    navLinks: document.querySelectorAll('.nav-link'),
};

function initApp() {
    initTheme();
    setupInstallPrompt();
    bindBaseEvents();
    loadTasks();
    renderApp();
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';

    document.body.classList.toggle('light', savedTheme === 'light');
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light');
    const theme = isLight ? 'light' : 'dark';

    localStorage.setItem('theme', theme);
    updateThemeIcon(theme);
}

function openInstallHelpModal() {
    if (!elements.installHelpModal) return;

    elements.installHelpModal.classList.add('is-open');
    elements.installHelpModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
}

function closeInstallHelpModal() {
    if (!elements.installHelpModal) return;

    elements.installHelpModal.classList.remove('is-open');
    elements.installHelpModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
}

function updateThemeIcon(theme) {
    if (!elements.themeToggle) return;

    const isLight = theme === 'light';

    elements.themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
    elements.themeToggle.title = isLight
        ? 'Переключить на тёмную тему'
        : 'Переключить на светлую тему';
}
function setupInstallPrompt() {
    // iPhone / iPad: показываем кнопку вручную, если приложение ещё не установлено
    if (isIos() && !isInStandaloneMode() && elements.installAppBtn) {
        elements.installAppBtn.classList.remove('is-hidden');
    }

    // Android / Chrome
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;

        if (elements.installAppBtn) {
            elements.installAppBtn.classList.remove('is-hidden');
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;

        if (elements.installAppBtn) {
            elements.installAppBtn.classList.add('is-hidden');
        }
    });
}

function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isInStandaloneMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

async function handleInstallApp() {
    // iPhone / iPad
    if (isIos() && !isInStandaloneMode()) {
        openInstallHelpModal();
        return;
    }

    // Android / Chrome
    if (!deferredInstallPrompt) {
        if (isIos()) {
            openInstallHelpModal();
        } else {
            alert('Установка пока недоступна в этом браузере.');
        }
        return;
    }

    deferredInstallPrompt.prompt();

    const choiceResult = await deferredInstallPrompt.userChoice;

    if (choiceResult.outcome === 'accepted') {
        deferredInstallPrompt = null;

        if (elements.installAppBtn) {
            elements.installAppBtn.classList.add('is-hidden');
        }
    }
}

function bindBaseEvents() {
    window.addEventListener('scroll', handleHeaderScroll);

    if (elements.burger) {
        elements.burger.addEventListener('click', toggleMobileMenu);
    }

    elements.navLinks.forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });

    if (elements.openTaskModalBtn) {
        elements.openTaskModalBtn.addEventListener('click', () => openCreateModal('backlog'));
    }

    if (elements.heroCreateTaskBtn) {
        elements.heroCreateTaskBtn.addEventListener('click', () => openCreateModal('today'));
    }

    if (elements.boardCreateTaskBtn) {
        elements.boardCreateTaskBtn.addEventListener('click', () => openCreateModal('backlog'));
    }

    if (elements.clearDoneBtn) {
        elements.clearDoneBtn.addEventListener('click', clearDoneTasks);
    }

    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
    }

    if (elements.installAppBtn) {
        elements.installAppBtn.addEventListener('click', handleInstallApp);
    }

    if (elements.closeTaskModalBtn) {
        elements.closeTaskModalBtn.addEventListener('click', closeModal);
    }

    if (elements.cancelTaskBtn) {
        elements.cancelTaskBtn.addEventListener('click', closeModal);
    }

    if (elements.taskModalOverlay) {
        elements.taskModalOverlay.addEventListener('click', closeModal);
    }

    if (elements.taskForm) {
        elements.taskForm.addEventListener('submit', handleTaskSubmit);
    }

    if (elements.deleteTaskBtn) {
        elements.deleteTaskBtn.addEventListener('click', handleDeleteTask);
    }

    if (elements.closeInstallHelpBtn) {
        elements.closeInstallHelpBtn.addEventListener('click', closeInstallHelpModal);
    }

    if (elements.installHelpOverlay) {
        elements.installHelpOverlay.addEventListener('click', closeInstallHelpModal);
    }

    if (elements.installHelpOkBtn) {
        elements.installHelpOkBtn.addEventListener('click', closeInstallHelpModal);
    }

    document.addEventListener('keydown', handleGlobalKeydown);

    setupBoardDnD();

    const filterButtons = document.querySelectorAll('.filter-btn');

    filterButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            filterButtons.forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');

            appState.filter = btn.dataset.filter;

            renderApp();
        });
    });
}

function handleHeaderScroll() {
    if (!elements.header) return;

    if (window.scrollY > 20) {
        elements.header.classList.add('scrolled');
    } else {
        elements.header.classList.remove('scrolled');
    }
}

function toggleMobileMenu() {
    elements.burger.classList.toggle('active');
    elements.nav.classList.toggle('active');
    document.body.classList.toggle('no-scroll');
}

function closeMobileMenu() {
    if (!elements.burger || !elements.nav) return;

    elements.burger.classList.remove('active');
    elements.nav.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

function handleGlobalKeydown(event) {
    if (event.key === 'Escape' && elements.taskModal.classList.contains('is-open')) {
        closeModal();
    }

    if (event.key === 'Escape' && elements.installHelpModal?.classList.contains('is-open')) {
        closeInstallHelpModal();
    }
}

function openCreateModal(defaultStatus = 'backlog') {
    appState.editingTaskId = null;
    resetForm();

    elements.taskModalTitle.textContent = 'Создать задачу';
    elements.taskStatusInput.value = defaultStatus;
    elements.deleteTaskBtn.classList.add('is-hidden');

    openModal();
}

function openEditModal(taskId) {
    const task = appState.tasks.find((item) => item.id === taskId);
    if (!task) return;

    appState.editingTaskId = task.id;

    elements.taskModalTitle.textContent = 'Редактировать задачу';
    elements.deleteTaskBtn.classList.remove('is-hidden');

    elements.taskIdInput.value = task.id;
    elements.taskTitleInput.value = task.title;
    elements.taskDescriptionInput.value = task.description || '';
    elements.taskPriorityInput.value = task.priority;
    elements.taskStatusInput.value = task.status;
    elements.taskDueDateInput.value = task.dueDate || '';
    elements.taskTagsInput.value = (task.tags || []).join(', ');

    openModal();
}

function openModal() {
    elements.taskModal.classList.add('is-open');
    elements.taskModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');

    setTimeout(() => {
        elements.taskTitleInput?.focus();
    }, 50);
}

function closeModal() {
    elements.taskModal.classList.remove('is-open');
    elements.taskModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    resetForm();
}

function resetForm() {
    if (!elements.taskForm) return;

    elements.taskForm.reset();
    elements.taskIdInput.value = '';
    elements.taskPriorityInput.value = 'medium';
    elements.taskStatusInput.value = 'backlog';
    elements.taskDueDateInput.value = '';
    elements.taskTagsInput.value = '';
    appState.editingTaskId = null;
}

//  функция для тегов
function parseTags(value) {
    return value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
        .filter((tag, index, array) => array.indexOf(tag) === index);
}

//  обработчик формы
function handleTaskSubmit(event) {
    event.preventDefault();

    const title = elements.taskTitleInput.value.trim();
    const description = elements.taskDescriptionInput.value.trim();
    const priority = elements.taskPriorityInput.value;
    const status = elements.taskStatusInput.value;
    const dueDate = elements.taskDueDateInput.value;
    const tags = parseTags(elements.taskTagsInput.value);

    if (!title) {
        elements.taskTitleInput.focus();
        return;
    }

    if (appState.editingTaskId) {
        updateTask({
            id: appState.editingTaskId,
            title,
            description,
            priority,
            status,
            dueDate,
            tags,
        });
    } else {
        createTask({
            title,
            description,
            priority,
            status,
            dueDate,
            tags,
        });
    }

    closeModal();
    renderApp();
}

function createTask(taskData) {
    const newTask = {
        id: generateTaskId(),
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        status: taskData.status,
        dueDate: taskData.dueDate,
        tags: taskData.tags || [],
        createdAt: new Date().toISOString(),
    };

    appState.tasks.unshift(newTask);
    saveTasks();
}

function updateTask(updatedTask) {
    appState.tasks = appState.tasks.map((task) => {
        if (task.id !== updatedTask.id) return task;

        return {
            ...task,
            title: updatedTask.title,
            description: updatedTask.description,
            priority: updatedTask.priority,
            status: updatedTask.status,
            dueDate: updatedTask.dueDate,
            tags: updatedTask.tags || [],
        };
    });

    saveTasks();
}

function handleDeleteTask() {
    if (!appState.editingTaskId) return;

    const confirmed = window.confirm('Удалить эту задачу?');
    if (!confirmed) return;

    deleteTask(appState.editingTaskId);
    closeModal();
    renderApp();
}

function deleteTask(taskId) {
    appState.tasks = appState.tasks.filter((task) => task.id !== taskId);
    saveTasks();
}

function clearDoneTasks() {
    const doneTasks = appState.tasks.filter((task) => task.status === 'done');

    if (!doneTasks.length) {
        alert('В колонке Done пока нет задач.');
        return;
    }

    const confirmed = window.confirm('Очистить все задачи из Done?');
    if (!confirmed) return;

    appState.tasks = appState.tasks.filter((task) => task.status !== 'done');
    saveTasks();
    renderApp();
}

function generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.tasks));
}

function loadTasks() {
    try {
        const rawTasks = localStorage.getItem(STORAGE_KEY);
        appState.tasks = rawTasks ? JSON.parse(rawTasks) : [];
    } catch (error) {
        console.error('Ошибка чтения задач из localStorage:', error);
        appState.tasks = [];
    }
}

function renderApp() {
    clearTaskLists();
    renderTasks();
    updateCounters();
    updateEmptyStates();
    updateFocusBlock();
}

function clearTaskLists() {
    Object.values(statusMap).forEach((statusConfig) => {
        const container = document.getElementById(statusConfig.containerId);
        if (container) {
            container.innerHTML = '';
        }
    });
}

function renderTasks() {
    let filteredTasks = [...appState.tasks];

    switch (appState.filter) {
        case 'active':
            filteredTasks = filteredTasks.filter((task) => task.status !== 'done');
            break;
        case 'done':
            filteredTasks = filteredTasks.filter((task) => task.status === 'done');
            break;
        case 'high':
            filteredTasks = filteredTasks.filter((task) => task.priority === 'high');
            break;
        default:
            break;
    }

    if (appState.activeTag) {
        filteredTasks = filteredTasks.filter(
            (task) => task.tags && task.tags.includes(appState.activeTag)
        );
    }

    const sortedTasks = filteredTasks.sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return bTime - aTime;
    });

    const tasksByStatus = {
        backlog: [],
        today: [],
        progress: [],
        done: [],
    };

    sortedTasks.forEach((task) => {
        if (tasksByStatus[task.status]) {
            tasksByStatus[task.status].push(task);
        }
    });

    Object.entries(tasksByStatus).forEach(([status, tasks]) => {
        const container = document.getElementById(statusMap[status]?.containerId);
        if (!container) return;

        const isExpanded = appState.expandedColumns[status];
        const visibleTasks = isExpanded ? tasks : tasks.slice(0, TASKS_PREVIEW_LIMIT);

        visibleTasks.forEach((task) => {
            const taskCard = createTaskCard(task);
            container.appendChild(taskCard);
        });

        renderColumnToggle(status, tasks.length, visibleTasks.length, container);
    });
}

function renderColumnToggle(status, totalCount, visibleCount, container) {
    if (totalCount <= TASKS_PREVIEW_LIMIT) return;

    const hiddenCount = totalCount - visibleCount;

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'task-list-toggle';

    if (appState.expandedColumns[status]) {
        toggleBtn.textContent = 'Свернуть';
    } else {
        toggleBtn.textContent = `Показать ещё (${hiddenCount})`;
    }

    toggleBtn.addEventListener('click', () => {
        appState.expandedColumns[status] = !appState.expandedColumns[status];
        renderApp();
    });

    container.appendChild(toggleBtn);
}

function createTaskCard(task) {
    const template = elements.taskCardTemplate.content.cloneNode(true);
    const taskCard = template.querySelector('.task-card');
    const badge = template.querySelector('.task-card__badge');
    const title = template.querySelector('.task-card__title');
    const text = template.querySelector('.task-card__text');
    const statusLabel = template.querySelector('.task-card__status-label');
    const date = template.querySelector('.task-card__date');
    const editButton = template.querySelector('.task-card__menu-btn');
    const tagsContainer = template.querySelector('.task-card__tags');

    taskCard.dataset.taskId = task.id;

    const priorityData = getPriorityData(task);

    badge.textContent = priorityData.label;
    badge.classList.add(priorityData.className);

    if (task.status === 'done') {
        badge.classList.remove(
            'task-card__badge--low',
            'task-card__badge--medium',
            'task-card__badge--high'
        );
        badge.classList.add('task-card__badge--done');
        badge.textContent = 'Done';
    }

    title.textContent = task.title;
    text.textContent = task.description || 'Без описания';

    if (tagsContainer) {
        tagsContainer.innerHTML = '';

        if (task.tags && task.tags.length) {
            task.tags.forEach((tag) => {
                const tagElement = document.createElement('span');
                tagElement.className = 'task-card__tag';
                tagElement.textContent = `#${tag}`;
                tagElement.addEventListener('click', (e) => {
                    e.stopPropagation();
                    appState.activeTag = tag;
                    renderApp();
                });
                tagsContainer.appendChild(tagElement);
            });
        }
    }

    statusLabel.textContent = statusMap[task.status]?.label || 'Unknown';

    if (task.dueDate) {
        date.textContent = formatDate(task.dueDate);

        if (isOverdue(task.dueDate, task.status)) {
            date.classList.add('is-overdue');
        }
    } else {
        date.textContent = 'Без дедлайна';
    }

    taskCard.addEventListener('click', (event) => {
        if (event.target.closest('.task-card__menu-btn')) return;
        openEditModal(task.id);
    });

    editButton.addEventListener('click', (event) => {
        event.stopPropagation();
        openEditModal(task.id);
    });

    taskCard.addEventListener('dragstart', () => handleDragStart(task.id, taskCard));
    taskCard.addEventListener('dragend', () => handleDragEnd(taskCard));

    return taskCard;
}

function getPriorityData(task) {
    if (task.status === 'done') {
        return {
            label: 'Done',
            className: 'task-card__badge--done',
        };
    }

    return priorityMap[task.priority] || priorityMap.medium;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Без дедлайна';

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(date);
}

function isOverdue(dateString, status) {
    if (!dateString || status === 'done') return false;

    const today = new Date();
    const dueDate = new Date(dateString);

    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today;
}

function updateCounters() {
    const counts = {
        backlog: 0,
        today: 0,
        progress: 0,
        done: 0,
    };

    // считаем задачи по статусам
    appState.tasks.forEach((task) => {
        if (counts[task.status] !== undefined) {
            counts[task.status] += 1;
        }
    });

    // обновляем счётчики колонок
    Object.entries(counts).forEach(([status, count]) => {
        const countElement = document.getElementById(statusMap[status].countId);
        if (countElement) {
            countElement.textContent = count;
        }
    });

    const total = appState.tasks.length;
    const active = total - counts.done;

    // hero-метрики
    elements.totalTasksCount.textContent = active;       // Актуальные
    elements.inProgressTasksCount.textContent = counts.progress;
    elements.doneTasksCount.textContent = counts.done;
    elements.todayTasksCount.textContent = counts.today;

    //  ПРОГРЕСС
    const percent = total === 0 ? 0 : Math.round((counts.done / total) * 100);

    const progressEl = document.getElementById('progressText');
    if (progressEl) {
        progressEl.textContent = `Выполнено ${counts.done} из ${total} · ${percent}%`;
    }
}

function updateEmptyStates() {
    Object.keys(statusMap).forEach((status) => {
        const container = document.getElementById(statusMap[status].containerId);
        const emptyState = document.querySelector(`.empty-state[data-empty="${status}"]`);

        if (!container || !emptyState) return;

        if (container.children.length > 0) {
            emptyState.classList.add('is-hidden');
        } else {
            emptyState.classList.remove('is-hidden');
        }
    });
}

function updateFocusBlock() {
    const todayTasks = appState.tasks.filter((task) => task.status === 'today');

    if (!todayTasks.length) {
        elements.focusTaskText.textContent =
            'Пока нет задач в колонке Today. Добавь задачу и перенеси её в фокус.';
        return;
    }

    const sortedTodayTasks = [...todayTasks].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

    const focusTask = sortedTodayTasks[0];
    const duePart = focusTask.dueDate ? ` Дедлайн: ${formatDate(focusTask.dueDate)}.` : '';

    elements.focusTaskText.textContent = `${focusTask.title}.${duePart} ${focusTask.description ? focusTask.description : ''
        }`.trim();
}

function setupBoardDnD() {
    elements.boardColumns.forEach((column) => {
        column.addEventListener('dragover', (event) => {
            event.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', (event) => {
            const relatedTarget = event.relatedTarget;
            if (!column.contains(relatedTarget)) {
                column.classList.remove('drag-over');
            }
        });

        column.addEventListener('drop', (event) => {
            event.preventDefault();
            column.classList.remove('drag-over');

            const newStatus = column.dataset.status;
            if (!appState.draggedTaskId || !newStatus) return;

            moveTaskToStatus(appState.draggedTaskId, newStatus);
        });
    });
}

function handleDragStart(taskId, taskCard) {
    appState.draggedTaskId = taskId;
    taskCard.classList.add('is-dragging');
}

function handleDragEnd(taskCard) {
    taskCard.classList.remove('is-dragging');
    appState.draggedTaskId = null;

    elements.boardColumns.forEach((column) => {
        column.classList.remove('drag-over');
    });
}

function moveTaskToStatus(taskId, newStatus) {
    let changed = false;

    appState.tasks = appState.tasks.map((task) => {
        if (task.id !== taskId) return task;
        if (task.status === newStatus) return task;

        changed = true;

        return {
            ...task,
            status: newStatus,
        };
    });

    if (!changed) return;

    saveTasks();
    renderApp();
}

initApp();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}