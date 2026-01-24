/**
 * Chore Completion History JavaScript
 */

let currentUser = null;
let allChores = [];
let allUsers = [];
let userChart = null;
let choreChart = null;

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

    // Load initial data
    await loadUsers();
    await loadChores();
    await loadUserChart();
});

async function loadUsers() {
    try {
        allUsers = await api.getUsers({ is_active: true });
    } catch (error) {
        console.error('Failed to load users:', error);
        showAlert('Failed to load users: ' + error.message, 'error');
    }
}

async function loadChores() {
    try {
        allChores = await api.getChores({ is_active: true });

        // Populate chore selector
        const choreSelector = document.getElementById('chore-selector');
        choreSelector.innerHTML = '<option value="">Select a chore...</option>';

        allChores.forEach(chore => {
            const option = document.createElement('option');
            option.value = chore.id;
            option.textContent = chore.name;
            choreSelector.appendChild(option);
        });
    } catch (error) {
        console.error('Failed to load chores:', error);
        showAlert('Failed to load chores: ' + error.message, 'error');
    }
}

// New function to load both chart and grid when a chore is selected
async function loadChoreDetails() {
    const choreId = document.getElementById('chore-selector').value;

    if (!choreId) {
        // Hide both sections if no chore selected
        document.getElementById('chore-chart-card').style.display = 'none';
        document.getElementById('completion-grid-card').style.display = 'none';
        if (choreChart) {
            choreChart.destroy();
            choreChart = null;
        }
        document.getElementById('completion-grid-container').innerHTML = '';
        return;
    }

    // Show both sections
    document.getElementById('chore-chart-card').style.display = 'block';
    document.getElementById('completion-grid-card').style.display = 'block';

    // Load both visualizations
    await loadChoreChart();
    await loadCompletionGrid();
}

async function loadUserChart() {
    try {
        // Get completions for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const completions = await api.getCompletions({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate)
        });

        // Count completions by user and chore
        const userChoreCount = {};
        const choreNames = new Set();

        completions.forEach(completion => {
            const userId = completion.user_id;
            const choreId = completion.chore_id;

            if (!userChoreCount[userId]) {
                userChoreCount[userId] = {};
            }
            if (!userChoreCount[userId][choreId]) {
                userChoreCount[userId][choreId] = 0;
            }
            userChoreCount[userId][choreId]++;
            choreNames.add(choreId);
        });

        // Prepare chart data
        const choreLabels = allChores
            .filter(c => choreNames.has(c.id))
            .map(c => c.name);

        const datasets = allUsers.map((user, index) => {
            const data = allChores
                .filter(c => choreNames.has(c.id))
                .map(chore => userChoreCount[user.id]?.[chore.id] || 0);

            return {
                label: user.name,
                data: data,
                backgroundColor: getColor(index),
                borderColor: getColor(index),
                borderWidth: 1
            };
        });

        // Create chart
        const ctx = document.getElementById('user-chart').getContext('2d');

        if (userChart) {
            userChart.destroy();
        }

        userChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: choreLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Chore'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Completions'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Failed to load user chart:', error);
        showAlert('Failed to load user chart: ' + error.message, 'error');
    }
}

async function loadChoreChart() {
    const choreId = document.getElementById('chore-selector').value;

    if (!choreId) {
        if (choreChart) {
            choreChart.destroy();
            choreChart = null;
        }
        return;
    }

    try {
        // Get completions for last 30 days
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        const completions = await api.getCompletions({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            chore_id: choreId
        });

        // Count completions by user
        const userCount = {};
        completions.forEach(completion => {
            const userId = completion.user_id;
            if (!userCount[userId]) {
                userCount[userId] = 0;
            }
            userCount[userId]++;
        });

        // Prepare chart data
        const userLabels = allUsers.map(u => u.name);
        const data = allUsers.map(u => userCount[u.id] || 0);

        // Create chart
        const ctx = document.getElementById('chore-chart').getContext('2d');

        if (choreChart) {
            choreChart.destroy();
        }

        choreChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: userLabels,
                datasets: [{
                    label: 'Completions',
                    data: data,
                    backgroundColor: '#4A90E2',
                    borderColor: '#357ABD',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'User'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Completions'
                        },
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

    } catch (error) {
        console.error('Failed to load chore chart:', error);
        showAlert('Failed to load chore chart: ' + error.message, 'error');
    }
}

async function loadCompletionGrid() {
    const choreId = document.getElementById('chore-selector').value;
    const container = document.getElementById('completion-grid-container');

    if (!choreId) {
        container.innerHTML = '';
        return;
    }

    try {
        // Get completions for last 4 weeks (28 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 28);

        const completions = await api.getCompletions({
            start_date: formatDate(startDate),
            end_date: formatDate(endDate),
            chore_id: choreId
        });

        // Create date array for last 28 days
        const dates = [];
        for (let i = 27; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date);
        }

        // Create completion map: user_id -> { date -> completion }
        const completionMap = {};
        allUsers.forEach(user => {
            completionMap[user.id] = {};
        });

        completions.forEach(completion => {
            const completionDate = new Date(completion.completed_at);
            const dateKey = formatDate(completionDate);
            const userId = completion.user_id;

            if (completionMap[userId]) {
                completionMap[userId][dateKey] = true;
            }
        });

        // Build grid HTML
        let html = '<div class="completion-grid">';

        // Header row with dates
        html += '<div class="grid-row header-row">';
        html += '<div class="grid-cell header-cell">User</div>';
        dates.forEach(date => {
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
            html += `<div class="grid-cell header-cell"><div class="date-label">${dateStr}</div><div class="day-label">${dayStr}</div></div>`;
        });
        html += '</div>';

        // User rows
        allUsers.forEach(user => {
            html += '<div class="grid-row">';
            html += `<div class="grid-cell user-cell">${user.name}</div>`;

            dates.forEach(date => {
                const dateKey = formatDate(date);
                const hasCompletion = completionMap[user.id][dateKey];
                const cellClass = hasCompletion ? 'grid-cell completion-cell completed' : 'grid-cell completion-cell';
                const content = hasCompletion ? '✅' : '';
                html += `<div class="${cellClass}">${content}</div>`;
            });

            html += '</div>';
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Failed to load completion grid:', error);
        showAlert('Failed to load completion grid: ' + error.message, 'error');
    }
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get consistent colors for users
function getColor(index) {
    const colors = [
        '#4A90E2', // Blue
        '#7ED321', // Green
        '#F5A623', // Orange
        '#D0021B', // Red
        '#9013FE', // Purple
        '#50E3C2', // Teal
        '#F8E71C', // Yellow
        '#BD10E0', // Magenta
    ];
    return colors[index % colors.length];
}
