/**
 * Weekly Chores View JavaScript
 */

let currentUser = null;
let currentWeekStart = null;
let weeklyData = null;
let allUsers = [];
let currentFilters = {
    frequency: '',
    userId: ''
};
let editMode = false;
let currentEditChore = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    currentUser = requireAuth();
    if (!currentUser) return;

    // Display user info
    document.getElementById('current-user-name').textContent = currentUser.name;

    // Show admin link if user is admin
    if (currentUser.is_admin) {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) {
            adminLink.style.display = 'block';
        }
    }

    // Set current week
    currentWeekStart = getWeekStart();

    // Load users for filter dropdown
    await loadUsers();

    // Load data
    await loadWeeklyChores();
});

// Helper function to format date as YYYY-MM-DD in local timezone
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadUsers() {
    try {
        allUsers = await api.getUsers({ is_active: true });

        // Populate user filter dropdown
        const userFilter = document.getElementById('user-filter');
        userFilter.innerHTML = '<option value="">All Users</option>';

        allUsers.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userFilter.appendChild(option);
        });

        // Populate edit modal assigned user dropdown
        const assignedSelect = document.getElementById('edit-chore-assigned');
        if (assignedSelect) {
            assignedSelect.innerHTML = '<option value="">Unassigned</option>';
            allUsers.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = user.name;
                assignedSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Failed to load users:', error);
    }
}

function applyFilters() {
    currentFilters.frequency = document.getElementById('frequency-filter').value;
    currentFilters.userId = document.getElementById('user-filter').value;
    console.log('Applying filters:', currentFilters);
    loadWeeklyChores();
}

function clearFilters() {
    document.getElementById('frequency-filter').value = '';
    document.getElementById('user-filter').value = '';
    currentFilters.frequency = '';
    currentFilters.userId = '';
    loadWeeklyChores();
}

async function loadWeeklyChores() {
    const loadingEl = document.getElementById('chores-loading');
    const gridEl = document.getElementById('weekly-grid');

    try {
        // Show loading
        loadingEl.classList.remove('hidden');
        gridEl.classList.add('hidden');

        // Format date as YYYY-MM-DD in local timezone
        const weekStartStr = formatDateLocal(currentWeekStart);

        // Fetch weekly chores with filters
        const userId = currentFilters.userId || null;
        const frequency = currentFilters.frequency || null;
        console.log('Loading chores with filters - userId:', userId, 'frequency:', frequency);
        weeklyData = await api.getWeeklyChores(weekStartStr, userId, frequency);
        console.log('Loaded chores:', weeklyData.total_chores, 'chores');

        // Update week display
        document.getElementById('week-display').textContent = `Week of ${formatWeekRange(currentWeekStart)}`;

        // Update stats
        document.getElementById('total-chores').textContent = weeklyData.total_chores;
        document.getElementById('completed-chores').textContent = weeklyData.completed_chores;

        const rate = weeklyData.total_chores > 0
            ? Math.round((weeklyData.completed_chores / weeklyData.total_chores) * 100)
            : 0;
        document.getElementById('completion-rate').textContent = `${rate}%`;

        // Hide loading
        loadingEl.classList.add('hidden');
        gridEl.classList.remove('hidden');

        // Render weekly grid
        renderWeeklyGrid();

    } catch (error) {
        loadingEl.classList.add('hidden');
        showAlert('Failed to load chores: ' + error.message, 'error');
    }
}

function renderWeeklyGrid() {
    const gridEl = document.getElementById('weekly-grid');
    gridEl.innerHTML = '';

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Separate current user's chores from other chores
    const userChores = weeklyData.chores.filter(chore => chore.assigned_user_id === currentUser.id);
    const otherChores = weeklyData.chores.filter(chore => chore.assigned_user_id !== currentUser.id);

    // Group user chores by day
    const userChoresByDay = [[], [], [], [], [], [], []]; // 7 days
    // Group other chores by day
    const otherChoresByDay = [[], [], [], [], [], [], []]; // 7 days

    // Function to process and group chores
    const processChores = (chores, choresByDay) => {
        chores.forEach(chore => {
            // For each chore, determine which days it should appear on
            let daysToShow = [];

            if (chore.frequency === 'twice_weekly') {
                // Show on both assigned days
                if (chore.day_of_week !== null && chore.day_of_week !== undefined) {
                    daysToShow.push(chore.day_of_week);
                }
                if (chore.day_of_week_2 !== null && chore.day_of_week_2 !== undefined) {
                    daysToShow.push(chore.day_of_week_2);
                }
            } else if (chore.day_of_week !== null && chore.day_of_week !== undefined) {
                // Show on single assigned day
                daysToShow.push(chore.day_of_week);
            } else {
                // No assigned day - show on all days or only on completed days
                if (chore.completions && chore.completions.length > 0) {
                    // Show only on days where it was completed
                    chore.completions.forEach(completion => {
                        const completedDate = new Date(completion.completed_at);
                        const completedDayOfWeek = completedDate.getDay();
                        const dayIndex = completedDayOfWeek === 0 ? 6 : completedDayOfWeek - 1;
                        daysToShow.push(dayIndex);
                    });
                } else {
                    // Not completed, show on all days
                    daysToShow = [0, 1, 2, 3, 4, 5, 6];
                }
            }

            // Add chore to each day it should appear on
            daysToShow.forEach(dayIndex => {
                // For this day, check if there's a completion
                const completionForDay = chore.completions.find(c => {
                    const completedDate = new Date(c.completed_at);
                    const completedDayOfWeek = completedDate.getDay();
                    const compDayIndex = completedDayOfWeek === 0 ? 6 : completedDayOfWeek - 1;
                    return compDayIndex === dayIndex;
                });

                // Create a chore object specific to this day
                const choreForDay = {
                    ...chore,
                    is_completed: !!completionForDay,
                    completed_at: completionForDay?.completed_at,
                    completed_by: completionForDay?.completed_by,
                    completed_by_name: completionForDay?.completed_by_name,
                    completion_notes: completionForDay?.notes,
                    completion_id: completionForDay?.completion_id
                };

                choresByDay[dayIndex].push(choreForDay);
            });
        });
    };

    // Process both user chores and other chores
    processChores(userChores, userChoresByDay);
    processChores(otherChores, otherChoresByDay);

    // Sort each day's chores: incomplete first, completed last
    const sortChores = (dayChores) => {
        dayChores.sort((a, b) => {
            // If one is completed and the other isn't, completed goes to bottom
            if (a.is_completed && !b.is_completed) return 1;
            if (!a.is_completed && b.is_completed) return -1;
            // Otherwise maintain original order (already sorted by backend)
            return 0;
        });
    };

    userChoresByDay.forEach(sortChores);
    otherChoresByDay.forEach(sortChores);

    // Create day columns
    for (let i = 0; i < 7; i++) {
        const dayColumn = createDayColumn(dayNames[i], i, userChoresByDay[i], otherChoresByDay[i]);
        gridEl.appendChild(dayColumn);
    }
}

function createDayColumn(dayName, dayIndex, userChores, otherChores) {
    const column = document.createElement('div');
    column.className = 'day-column';

    // Day header
    const header = document.createElement('div');
    header.className = 'day-header';

    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);

    // Check if this is today's date
    const today = new Date();
    const isToday = date.getFullYear() === today.getFullYear() &&
                    date.getMonth() === today.getMonth() &&
                    date.getDate() === today.getDate();

    // Add data attribute and ID for today's column
    if (isToday) {
        column.setAttribute('data-today', 'true');
        column.id = 'today-column';
    }

    header.innerHTML = `
        ${dayName}
        <span class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    `;

    column.appendChild(header);

    // Add user's chores section (highlighted)
    if (userChores.length > 0) {
        const userSection = document.createElement('div');
        userSection.className = 'user-chores-section';

        const userSectionLabel = document.createElement('div');
        userSectionLabel.className = 'user-chores-label';
        userSectionLabel.textContent = 'My Chores';
        userSection.appendChild(userSectionLabel);

        userChores.forEach(chore => {
            const choreEl = createChoreElement(chore, dayIndex, true);
            userSection.appendChild(choreEl);
        });

        column.appendChild(userSection);
    }

    // Add other chores section
    if (otherChores.length > 0) {
        const otherSection = document.createElement('div');
        otherSection.className = 'other-chores-section';

        if (userChores.length > 0) {
            const otherSectionLabel = document.createElement('div');
            otherSectionLabel.className = 'other-chores-label';
            otherSectionLabel.textContent = 'Other Chores';
            otherSection.appendChild(otherSectionLabel);
        }

        otherChores.forEach(chore => {
            const choreEl = createChoreElement(chore, dayIndex, false);
            otherSection.appendChild(choreEl);
        });

        column.appendChild(otherSection);
    }

    // If no chores at all
    if (userChores.length === 0 && otherChores.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'chore-description';
        empty.textContent = 'No chores';
        column.appendChild(empty);
    }

    return column;
}

function createChoreElement(chore, dayIndex, isUserChore = false) {
    const div = document.createElement('div');
    const classes = ['chore-item'];
    if (chore.is_completed) classes.push('completed');
    if (isUserChore) classes.push('user-chore');
    div.className = classes.join(' ');
    div.onclick = () => toggleChore(chore, dayIndex);

    const name = document.createElement('div');
    name.className = 'chore-name';
    name.textContent = chore.name;

    div.appendChild(name);

    if (chore.description) {
        const desc = document.createElement('div');
        desc.className = 'chore-description';
        desc.textContent = chore.description;
        div.appendChild(desc);
    }

    if (chore.is_completed) {
        const completed = document.createElement('div');
        completed.className = 'chore-assigned';
        completed.textContent = '✓ Completed';
        div.appendChild(completed);

        // Add completed by user name if available
        if (chore.completed_by_name) {
            const completedBy = document.createElement('div');
            completedBy.className = 'chore-assigned';
            completedBy.textContent = `Completed by: ${chore.completed_by_name}`;
            div.appendChild(completedBy);
        }
    }

    return div;
}

async function toggleChore(chore, dayIndex) {
    // If in edit mode, open the edit modal instead
    if (editMode) {
        openEditModal(chore);
        return;
    }

    try {
        if (chore.is_completed) {
            // Undo completion
            if (!chore.completion_id) {
                showAlert('Cannot undo this completion', 'error');
                return;
            }

            await api.deleteCompletion(chore.completion_id);
            showAlert(`${chore.name} marked as incomplete!`, 'success');
        } else {
            // Mark as complete
            // Calculate the date for the day that was clicked
            const completionDate = new Date(currentWeekStart);
            completionDate.setDate(completionDate.getDate() + dayIndex);

            // Format dates as YYYY-MM-DD for the API (using local timezone, not UTC)
            const weekStartStr = formatDateLocal(currentWeekStart);
            const completionDateStr = formatDateLocal(completionDate);

            await api.markComplete({
                chore_id: chore.id,
                user_id: currentUser.id,
                week_start: weekStartStr,
                completion_date: completionDateStr,
                notes: ''
            });
            showAlert(`${chore.name} marked as complete!`, 'success');
        }

        // Reload data
        await loadWeeklyChores();

    } catch (error) {
        showAlert('Failed to update chore: ' + error.message, 'error');
    }
}

function previousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    loadWeeklyChores();
}

function nextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    loadWeeklyChores();
}

// Edit Mode Functions
function toggleEditMode() {
    editMode = !editMode;
    const btn = document.getElementById('edit-mode-btn');
    const text = document.getElementById('edit-mode-text');

    if (editMode) {
        btn.classList.add('active');
        text.textContent = 'Exit Edit Mode';
        showAlert('Edit mode enabled. Click on any chore to edit it.', 'info');
    } else {
        btn.classList.remove('active');
        text.textContent = 'Assign Chores';
        showAlert('Edit mode disabled. Click on chores to mark them complete.', 'info');
    }
}

function openEditModal(chore) {
    currentEditChore = chore;
    const modal = document.getElementById('edit-chore-modal');

    // Populate form fields
    document.getElementById('edit-chore-name').value = chore.name || '';
    document.getElementById('edit-chore-description').value = chore.description || '';
    document.getElementById('edit-chore-frequency').value = chore.frequency || 'weekly';
    document.getElementById('edit-chore-day').value = chore.day_of_week !== null ? chore.day_of_week : '';
    document.getElementById('edit-chore-day-2').value = chore.day_of_week_2 !== null ? chore.day_of_week_2 : '';
    document.getElementById('edit-chore-assigned').value = chore.assigned_user_id || '';
    document.getElementById('edit-chore-active').checked = chore.is_active !== false;

    // Update day fields visibility based on frequency
    updateDayFields();

    // Show modal
    modal.classList.add('active');
}

function closeEditModal() {
    const modal = document.getElementById('edit-chore-modal');
    modal.classList.remove('active');
    currentEditChore = null;
}

function updateDayFields() {
    const frequency = document.getElementById('edit-chore-frequency').value;
    const dayGroup = document.getElementById('day-of-week-group');
    const day2Group = document.getElementById('day-of-week-2-group');

    if (frequency === 'twice_weekly') {
        dayGroup.classList.remove('hidden');
        day2Group.classList.remove('hidden');
    } else if (frequency === 'weekly') {
        dayGroup.classList.remove('hidden');
        day2Group.classList.add('hidden');
    } else {
        dayGroup.classList.add('hidden');
        day2Group.classList.add('hidden');
    }
}

async function saveChore(event) {
    event.preventDefault();

    if (!currentEditChore) {
        showAlert('No chore selected for editing', 'error');
        return;
    }

    try {
        const choreData = {
            name: document.getElementById('edit-chore-name').value,
            description: document.getElementById('edit-chore-description').value || null,
            frequency: document.getElementById('edit-chore-frequency').value,
            day_of_week: document.getElementById('edit-chore-day').value ? parseInt(document.getElementById('edit-chore-day').value) : null,
            day_of_week_2: document.getElementById('edit-chore-day-2').value ? parseInt(document.getElementById('edit-chore-day-2').value) : null,
            assigned_user_id: document.getElementById('edit-chore-assigned').value ? parseInt(document.getElementById('edit-chore-assigned').value) : null,
            is_active: document.getElementById('edit-chore-active').checked
        };

        await api.updateChore(currentEditChore.id, choreData);
        showAlert('Chore updated successfully!', 'success');
        closeEditModal();
        await loadWeeklyChores();

    } catch (error) {
        showAlert('Failed to update chore: ' + error.message, 'error');
    }
}

// Close modal when clicking outside of it
document.addEventListener('click', function(event) {
    const modal = document.getElementById('edit-chore-modal');
    if (event.target === modal) {
        closeEditModal();
    }
});

/**
 * Floating scroll button functionality
 * Shows "Jump to Today" when at top, "Return to Top" when scrolled down
 */
let floatingButton = null;

function initFloatingButton() {
    // Create floating button if it doesn't exist
    if (!floatingButton) {
        floatingButton = document.createElement('button');
        floatingButton.id = 'floating-scroll-btn';
        floatingButton.className = 'floating-scroll-btn';
        floatingButton.innerHTML = '<span id="floating-btn-text">Jump to Today</span>';
        floatingButton.onclick = handleFloatingButtonClick;
        document.body.appendChild(floatingButton);

        // Add scroll listener to update button state
        window.addEventListener('scroll', updateFloatingButton);
    }

    // Initial update
    updateFloatingButton();
}

function updateFloatingButton() {
    if (!floatingButton) return;

    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const buttonText = document.getElementById('floating-btn-text');

    // If scrolled down more than 200px, show "Return to Top"
    if (scrollPosition > 200) {
        buttonText.textContent = 'Return to Top';
        floatingButton.setAttribute('data-mode', 'top');
    } else {
        buttonText.textContent = 'Jump to Today';
        floatingButton.setAttribute('data-mode', 'today');
    }
}

function handleFloatingButtonClick() {
    const mode = floatingButton.getAttribute('data-mode');

    if (mode === 'top') {
        // Scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    } else {
        // Scroll to today's column
        const todayColumn = document.getElementById('today-column');
        if (todayColumn) {
            todayColumn.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'start'
            });
        }
    }
}

// Initialize floating button when DOM is ready
// Wait until after initial load to avoid interfering with authentication
setTimeout(initFloatingButton, 500);
