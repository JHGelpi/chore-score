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

// Helper function to format date as YYYY-MM-DD in local timezone
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

    // Sort each day's chores: incomplete first, completed last
    choresByDay.forEach(dayChores => {
        dayChores.sort((a, b) => {
            // If one is completed and the other isn't, completed goes to bottom
            if (a.is_completed && !b.is_completed) return 1;
            if (!a.is_completed && b.is_completed) return -1;
            // Otherwise maintain original order
            return 0;
        });
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
            const choreEl = createChoreElement(chore, dayIndex);
            column.appendChild(choreEl);
        });
    }

    return column;
}

function createChoreElement(chore, dayIndex) {
    const div = document.createElement('div');
    div.className = `chore-item ${chore.is_completed ? 'completed' : ''}`;
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
