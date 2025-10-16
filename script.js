document.addEventListener('DOMContentLoaded', () => {
    // === 1. ZÍSKANIE ELEMENTOV ===
    const taskForm = document.getElementById('task-form');
    const taskList = document.getElementById('task-list');
    const emptyMessage = document.getElementById('empty-message');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submit-button');
    const taskIdToEdit = document.getElementById('task-id-to-edit');
    const dueHourInput = document.getElementById('due-hour');
    const dueMinuteInput = document.getElementById('due-minute');
    const dueDateInput = document.getElementById('due-date'); // Získanie elementu Dátumu
    const filtersContainer = document.querySelector('.filters');
    const sortTasksSelect = document.getElementById('sort-tasks');

    // Modálne okno
    const deleteModal = document.getElementById('delete-confirmation-modal');
    const modalConfirmButton = document.getElementById('modal-confirm');
    const modalCancelButton = document.getElementById('modal-cancel');

    let tasks = []; // Hlavné pole pre uloženie úloh
    
    // === 2. POMOCNÉ KONŠTANTY ===
    const colorMap = {
        personal: '#6F42C1',
        work: '#FFC107',
        academics: '#007BFF',
        health: '#4CAF50',
        default: '#6c757d'
    };

    // === 3. FUNKCIE PRE ČASOVÝ FORMÁT (Vynútenie 00:00 s type="number") ===

    /**
     * Vynúti formát '00' pri opustení poľa, čím zabezpečí vizuálny formát 00:00.
     * Prehliadač sa stará o validáciu rozsahu a šípky.
     */
    function formatTimeInput(inputElement) {
        let value = inputElement.value;
        
        // Ak je hodnota nevalidná (prázdna alebo non-numeric), nastaví 0
        let numValue = parseInt(value, 10);
        if (isNaN(numValue)) {
            numValue = 0;
        }

        // Vynúti formát dvoch číslic (00, 05, 12, ...)
        inputElement.value = String(numValue).padStart(2, '0');
    }

    // Aplikuje Listeners na časové polia
    if (dueHourInput && dueMinuteInput) {
        // Aplikuje formátovanie pri udalosti "blur" (keď používateľ opustí pole)
        dueHourInput.addEventListener('blur', () => formatTimeInput(dueHourInput));
        dueMinuteInput.addEventListener('blur', () => formatTimeInput(dueMinuteInput));

        // Pri štarte zaistíme správne 00
        formatTimeInput(dueHourInput);
        formatTimeInput(dueMinuteInput);
    }
    
    // === 4. FUNKCIE PRE DÁTUM (ZABRÁNENIE MINULOSTI) ===
    
    /**
     * Nastaví minimálny povolený dátum v inpute na dnešný dátum.
     */
    function setMinDate() {
        if (dueDateInput) {
            const today = new Date();
            // Formát pre YYYY-MM-DD
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const year = today.getFullYear();
            
            const minDate = `${year}-${month}-${day}`;
            
            dueDateInput.setAttribute('min', minDate);

            // Nastaví dnešný dátum, ak je pole prázdne (predvolené správanie)
            if (!dueDateInput.value) {
                 dueDateInput.value = minDate;
            }
        }
    }

    if (dueDateInput) {
        setMinDate();
    }


    // === 5. FUNKCIE PRE ÚLOHY (CREATE, READ, UPDATE, DELETE) ===

    /**
     * Načíta úlohy z localStorage.
     */
    function loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        renderTasks();
    }

    /**
     * Uloží aktuálne úlohy do localStorage.
     */
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    /**
     * Vykreslí úlohy do DOM na základe aktuálnych filtrov a triedenia.
     */
    function renderTasks() {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        const sortBy = sortTasksSelect.value;

        // 1. FILTROVANIE
        let filteredTasks = tasks.filter(task => {
            if (activeFilter === 'all') return true;
            return task.category === activeFilter;
        });

        // 2. TRIEDENIE
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                // Dokončené úlohy idú vždy na koniec
                return a.completed ? 1 : -1;
            }

            if (sortBy === 'time') {
                const dateA = new Date(a.date + 'T' + a.hour + ':' + a.minute + ':00');
                const dateB = new Date(b.date + 'T' + b.hour + ':' + b.minute + ':00');
                // Najbližší čas prvé (preto A - B)
                return dateA - dateB; 
            } else if (sortBy === 'priority') {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                // Vyššia priorita prvá
                return priorityOrder[b.priority] - priorityOrder[a.priority]; 
            } else if (sortBy === 'default') {
                // Najnovšie prvé (preto B - A)
                return b.createdAt - a.createdAt; 
            }
            return 0;
        });

        // 3. VYKRESLENIE
        taskList.innerHTML = '';
        if (filteredTasks.length === 0) {
            emptyMessage.style.display = 'block';
        } else {
            emptyMessage.style.display = 'none';
            filteredTasks.forEach(task => {
                taskList.appendChild(createTaskElement(task));
            });
        }
    }

    /**
     * Vytvorí DOM element pre jednu úlohu.
     */
    function createTaskElement(task) {
        const item = document.createElement('li');
        item.className = `task-item ${task.completed ? 'completed' : ''}`;
        item.dataset.id = task.id;
        item.dataset.category = task.category;
        
        // Farba postranného pruhu
        const taskColor = colorMap[task.category] || colorMap.default;
        
        // Formátovanie času a dátumu
        const displayDate = task.date ? new Date(task.date).toLocaleDateString('sk-SK') : 'N/A';
        const displayTime = `${task.hour}:${task.minute}`;
        
        // Zobrazenie priority
        const priorityClass = `task-priority-${task.priority}`;
        const priorityText = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
        
        item.innerHTML = `
            <div class="task-color-bar" style="background-color: ${taskColor};"></div>
            
            <div class="task-left">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                
                <div class="task-info">
                    <span class="task-name">${task.name}</span>
                    ${task.description ? `<span class="task-description">${task.description}</span>` : ''}
                    
                    <div class="task-meta-line">
                        <span class="task-meta">
                            <i class="fas fa-calendar-alt"></i> ${displayDate} 
                            <i class="fas fa-clock" style="margin-left: 8px;"></i> ${displayTime}
                        </span>
                        <span class="task-category-tag">${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
                        <span class="task-priority-tag ${priorityClass}">${priorityText} Priority</span>
                    </div>
                </div>
            </div>

            <div class="task-actions">
                <button class="edit-btn">Edit</button>
            </div>
        `;

        return item;
    }

    /**
     * Nastaví formulár do režimu editácie.
     */
    function setupEditMode(task) {
        formTitle.textContent = 'Edit Task';
        submitButton.textContent = 'Save Changes';
        submitButton.classList.add('editing');

        taskIdToEdit.value = task.id;
        document.getElementById('task-name').value = task.name;
        document.getElementById('task-description').value = task.description;
        document.getElementById('due-date').value = task.date;
        document.getElementById('task-category').value = task.category;
        document.getElementById('task-priority').value = task.priority;
        
        // Nastaví časové polia a VYNÚTI formát 00
        dueHourInput.value = task.hour;
        dueMinuteInput.value = task.minute;
        formatTimeInput(dueHourInput);
        formatTimeInput(dueMinuteInput);
    }

    /**
     * Resetuje formulár na režim pridávania.
     */
    function resetForm() {
        taskForm.reset();
        formTitle.textContent = 'Add New Task';
        submitButton.textContent = 'Add Task';
        submitButton.classList.remove('editing');
        taskIdToEdit.value = '';
        
        // Vynúti formát 00 pre čas (aj pri resete)
        formatTimeInput(dueHourInput);
        formatTimeInput(dueMinuteInput);
        
        // Nastaví defaultné hodnoty pre selecty a dátum
        document.getElementById('task-category').value = ''; 
        document.getElementById('task-priority').value = 'low'; 
        setMinDate(); // Re-nastaví min a dnešný dátum
    }

    // === 6. EVENT LISTENERS ===

    // 6.1. Spracovanie formulára (ADD / EDIT)
    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const id = taskIdToEdit.value;
        const name = document.getElementById('task-name').value.trim();
        const description = document.getElementById('task-description').value.trim();
        const date = document.getElementById('due-date').value;
        
        // Formátovanie času PRED uložením (vynúti rozsah a 00)
        formatTimeInput(dueHourInput);
        formatTimeInput(dueMinuteInput);
        const hour = dueHourInput.value;
        const minute = dueMinuteInput.value;
        
        const category = document.getElementById('task-category').value;
        const priority = document.getElementById('task-priority').value;

        if (id) {
            // EDITUJEME existujúcu úlohu
            const taskIndex = tasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
                tasks[taskIndex] = {
                    ...tasks[taskIndex], // Ponechá pôvodné completed, createdAt
                    name,
                    description,
                    date,
                    hour,
                    minute,
                    category,
                    priority
                };
            }
        } else {
            // PRIDÁVAME novú úlohu
            const newTask = {
                id: Date.now().toString(), // Jednoduché unikátne ID
                name,
                description,
                date,
                hour,
                minute,
                category,
                priority,
                completed: false,
                createdAt: Date.now() // Pre triedenie podľa default (najnovšie)
            };
            tasks.push(newTask);
        }

        saveTasks();
        renderTasks();
        resetForm();
    });

    // 6.2. Kliknutia v zozname úloh (CHECKBOX / EDIT)
    taskList.addEventListener('click', (e) => {
        const item = e.target.closest('.task-item');
        if (!item) return;
        const taskId = item.dataset.id;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        if (e.target.classList.contains('task-checkbox')) {
            // Označenie/odoznačenie ako dokončené
            task.completed = e.target.checked;
            saveTasks();

            if (task.completed) {
                // Zobraz modálne okno na potvrdenie zmazania
                deleteModal.classList.add('is-visible');
                modalConfirmButton.dataset.taskIdToDelete = taskId;
            } else {
                // Ak sa odoznačí, len prekresli
                renderTasks(); 
            }
            
        } else if (e.target.classList.contains('edit-btn')) {
            // Editácia
            setupEditMode(task);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll na formulár
        }
    });
    
    // 6.3. Filtrovanie
    filtersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            // Odstráň active zo všetkých
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            // Pridaj active na kliknuté
            e.target.classList.add('active');
            renderTasks();
        }
    });
    
    // 6.4. Triedenie
    sortTasksSelect.addEventListener('change', renderTasks);
    
    // 6.5. Modálne okno - Cancel
    modalCancelButton.addEventListener('click', () => {
        const taskId = modalConfirmButton.dataset.taskIdToDelete;
        const task = tasks.find(t => t.id === taskId);
        
        // Ak používateľ stlačí "Keep", úloha ostane dokončená, len skryjeme modal.
        if (task) {
            // Musíme zrušiť completed status, ak bola zrušená
            task.completed = true; 
        }
        deleteModal.classList.remove('is-visible');
        modalConfirmButton.dataset.taskIdToDelete = '';
        renderTasks();
    });
    
    // 6.6. Modálne okno - Confirm (Zmazať)
    modalConfirmButton.addEventListener('click', () => {
        const taskId = modalConfirmButton.dataset.taskIdToDelete;
        
        if (taskId) {
            // Filtrácia: odstráni úlohu so zadaným ID
            tasks = tasks.filter(t => t.id !== taskId);
            saveTasks();
            renderTasks();
        }
        
        deleteModal.classList.remove('is-visible');
        modalConfirmButton.dataset.taskIdToDelete = '';
    });
    
    // === 7. INICIALIZÁCIA ===
    loadTasks();
    resetForm();
});