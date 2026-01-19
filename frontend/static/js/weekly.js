/**
 * Weekly Chores View JavaScript
 */

let currentUser = null;
let currentWeekStart = null;
let weeklyData = null;

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

    // Load data
    await loadWeeklyChores();
});

async function loadWeeklyChores() {
    const loadingEl = document.getElementById('chores-loading');
    const gridEl = document.getElementById('weekly-grid');

    try {
        // Show loading
        loadingEl.classList.remove('hidden');
        gridEl.classList.add('hidden');

        // Format date as YYYY-MM-DD
        const weekStartStr = currentWeekStart.toISOString().split('T')[0];

        // Fetch weekly chores
        weeklyData = await api.getWeeklyChores(weekStartStr);

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

    // Group chores by day
    const choresByDay = [[], [], [], [], [], [], []]; // 7 days

    weeklyData.chores.forEach(chore => {
        if (chore.day_of_week !== null && chore.day_of_week !== undefined) {
            choresByDay[chore.day_of_week].push(chore);
        } else {
            // If no specific day, show in all days
            choresByDay.forEach(day => day.push(chore));
        }
    });

    // Create day columns
    for (let i = 0; i < 7; i++) {
        const dayColumn = createDayColumn(dayNames[i], i, choresByDay[i]);
        gridEl.appendChild(dayColumn);
    }
}

function createDayColumn(dayName, dayIndex, chores) {
    const column = document.createElement('div');
    column.className = 'day-column';

    // Day header
    const header = document.createElement('div');
    header.className = 'day-header';

    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + dayIndex);

    header.innerHTML = `
        ${dayName}
        <span class="day-date">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
    `;

    column.appendChild(header);

    // Add chores
    if (chores.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'chore-description';
        empty.textContent = 'No chores';
        column.appendChild(empty);
    } else {
        chores.forEach(chore => {
            const choreEl = createChoreElement(chore);
            column.appendChild(choreEl);
        });
    }

    return column;
}

function createChoreElement(chore) {
    const div = document.createElement('div');
    div.className = `chore-item ${chore.is_completed ? 'completed' : ''}`;
    div.onclick = () => toggleChore(chore);

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
    }

    return div;
}

async function toggleChore(chore) {
    if (chore.is_completed) {
        showAlert('This chore is already completed', 'info');
        return;
    }

    try {
        // Mark as complete
        await api.markComplete({
            chore_id: chore.id,
            user_id: currentUser.id,
            notes: ''
        });

        showAlert(`${chore.name} marked as complete!`, 'success');

        // Reload data
        await loadWeeklyChores();

    } catch (error) {
        showAlert('Failed to mark chore complete: ' + error.message, 'error');
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
