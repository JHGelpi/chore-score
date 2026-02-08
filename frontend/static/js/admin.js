/**
 * Admin Console JavaScript
 */

let users = [];
let chores = [];
let editingUserId = null;
let editingChoreId = null;
let editingCompletionId = null;
let completionsSortOrder = 'asc'; // 'asc' = oldest first, 'desc' = newest first

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is admin
    const currentUser = requireAuth();
    if (!currentUser || !currentUser.is_admin) {
        showAlert('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '/weekly';
        }, 2000);
        return;
    }

    await loadDashboardStats();
    await loadUsers();
    await loadChores();
    await loadCompletions();
});

async function loadDashboardStats() {
    try {
        const stats = await api.getDashboardStats();

        document.getElementById('stat-total-users').textContent = stats.users.total;
        document.getElementById('stat-active-chores').textContent = stats.chores.active;
        document.getElementById('stat-this-week').textContent = stats.completions.this_week;
        document.getElementById('stat-completion-rate').textContent = `${stats.completions.completion_rate}%`;

    } catch (error) {
        showAlert('Failed to load dashboard stats: ' + error.message, 'error');
    }
}

async function loadUsers() {
    const loadingEl = document.getElementById('users-loading');
    const containerEl = document.getElementById('users-table-container');

    try {
        loadingEl.classList.remove('hidden');
        containerEl.classList.add('hidden');

        users = await api.getUsers();

        loadingEl.classList.add('hidden');
        containerEl.classList.remove('hidden');

        // Render users table
        containerEl.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.name}</td>
                            <td>${user.email || '-'}</td>
                            <td>${user.is_admin ? 'Admin' : 'User'}</td>
                            <td>${user.is_active ? 'Active' : 'Inactive'}</td>
                            <td>
                                <button onclick="editUser(${user.id})" class="btn btn-sm btn-primary">Edit</button>
                                <button onclick="deleteUserConfirm(${user.id})" class="btn btn-sm btn-danger">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

    } catch (error) {
        loadingEl.classList.add('hidden');
        showAlert('Failed to load users: ' + error.message, 'error');
    }
}

async function loadChores() {
    const loadingEl = document.getElementById('chores-loading');
    const containerEl = document.getElementById('chores-table-container');

    try {
        loadingEl.classList.remove('hidden');
        containerEl.classList.add('hidden');

        chores = await api.getChores();

        // Also load users for the dropdown
        if (users.length === 0) {
            users = await api.getUsers({ is_active: true });
        }

        loadingEl.classList.add('hidden');
        containerEl.classList.remove('hidden');

        // Render chores table
        containerEl.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Frequency</th>
                        <th>Day</th>
                        <th>Assigned To</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${chores.map(chore => {
                        const assignedUser = users.find(u => u.id === chore.assigned_user_id);
                        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                        return `
                            <tr>
                                <td>${chore.name}</td>
                                <td>${chore.frequency}</td>
                                <td>${chore.day_of_week !== null ? dayNames[chore.day_of_week] : '-'}</td>
                                <td>${assignedUser ? assignedUser.name : 'Unassigned'}</td>
                                <td>${chore.is_active ? 'Active' : 'Inactive'}</td>
                                <td>
                                    <button onclick="editChore(${chore.id})" class="btn btn-sm btn-primary">Edit</button>
                                    <button onclick="deleteChoreConfirm(${chore.id})" class="btn btn-sm btn-danger">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

    } catch (error) {
        loadingEl.classList.add('hidden');
        showAlert('Failed to load chores: ' + error.message, 'error');
    }
}

// User Modal Functions
function showAddUserModal() {
    editingUserId = null;
    document.getElementById('user-modal-title').textContent = 'Add User';
    document.getElementById('user-form').reset();
    document.getElementById('user-modal').classList.add('active');
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    editingUserId = userId;
    document.getElementById('user-modal-title').textContent = 'Edit User';
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-email').value = user.email || '';
    document.getElementById('user-is-admin').checked = user.is_admin;
    document.getElementById('user-modal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    editingUserId = null;
}

async function saveUser(event) {
    event.preventDefault();

    const userData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value || null,
        is_admin: document.getElementById('user-is-admin').checked,
        is_active: true
    };

    try {
        if (editingUserId) {
            await api.updateUser(editingUserId, userData);
            showAlert('User updated successfully', 'success');
        } else {
            await api.createUser(userData);
            showAlert('User created successfully', 'success');
        }

        closeUserModal();
        await loadUsers();
        await loadDashboardStats();

    } catch (error) {
        showAlert('Failed to save user: ' + error.message, 'error');
    }
}

async function deleteUserConfirm(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
        return;
    }

    try {
        await api.deleteUser(userId);
        showAlert('User deleted successfully', 'success');
        await loadUsers();
        await loadDashboardStats();
    } catch (error) {
        showAlert('Failed to delete user: ' + error.message, 'error');
    }
}

// Chore Modal Functions
function showAddChoreModal() {
    editingChoreId = null;
    document.getElementById('chore-modal-title').textContent = 'Add Chore';
    document.getElementById('chore-form').reset();

    // Populate user dropdown
    populateUserDropdown();

    // Reset day fields visibility
    toggleDayFields();

    document.getElementById('chore-modal').classList.add('active');
}

function toggleDayFields() {
    const frequency = document.getElementById('chore-frequency').value;
    const day1Group = document.getElementById('day-1-group');
    const day2Group = document.getElementById('day-2-group');

    if (frequency === 'twice_weekly') {
        day1Group.querySelector('.form-label').textContent = 'First Day *';
        day1Group.classList.remove('hidden');
        day2Group.classList.remove('hidden');
    } else if (frequency === 'weekly') {
        day1Group.querySelector('.form-label').textContent = 'Day of Week (for weekly chores)';
        day1Group.classList.remove('hidden');
        day2Group.classList.add('hidden');
    } else {
        day1Group.classList.add('hidden');
        day2Group.classList.add('hidden');
    }
}

function editChore(choreId) {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;

    editingChoreId = choreId;
    document.getElementById('chore-modal-title').textContent = 'Edit Chore';
    document.getElementById('chore-name').value = chore.name;
    document.getElementById('chore-description').value = chore.description || '';
    document.getElementById('chore-frequency').value = chore.frequency;
    document.getElementById('chore-day').value = chore.day_of_week !== null ? chore.day_of_week : '';
    document.getElementById('chore-day-2').value = chore.day_of_week_2 !== null ? chore.day_of_week_2 : '';

    // Populate user dropdown
    populateUserDropdown();
    document.getElementById('chore-assigned-user').value = chore.assigned_user_id || '';

    // Update day fields visibility based on frequency
    toggleDayFields();

    document.getElementById('chore-modal').classList.add('active');
}

function populateUserDropdown() {
    const select = document.getElementById('chore-assigned-user');
    select.innerHTML = '<option value="">Unassigned</option>';

    users.filter(u => u.is_active).forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        select.appendChild(option);
    });
}

function closeChoreModal() {
    document.getElementById('chore-modal').classList.remove('active');
    editingChoreId = null;
}

async function saveChore(event) {
    event.preventDefault();

    const choreData = {
        name: document.getElementById('chore-name').value,
        description: document.getElementById('chore-description').value || null,
        frequency: document.getElementById('chore-frequency').value,
        day_of_week: document.getElementById('chore-day').value ? parseInt(document.getElementById('chore-day').value) : null,
        day_of_week_2: document.getElementById('chore-day-2').value ? parseInt(document.getElementById('chore-day-2').value) : null,
        assigned_user_id: document.getElementById('chore-assigned-user').value ? parseInt(document.getElementById('chore-assigned-user').value) : null,
        is_active: true
    };

    try {
        if (editingChoreId) {
            await api.updateChore(editingChoreId, choreData);
            showAlert('Chore updated successfully', 'success');
        } else {
            await api.createChore(choreData);
            showAlert('Chore created successfully', 'success');
        }

        closeChoreModal();
        await loadChores();
        await loadDashboardStats();

    } catch (error) {
        showAlert('Failed to save chore: ' + error.message, 'error');
    }
}

async function deleteChoreConfirm(choreId) {
    const chore = chores.find(c => c.id === choreId);
    if (!chore) return;

    if (!confirm(`Are you sure you want to delete chore "${chore.name}"? This will also delete all completion records.`)) {
        return;
    }

    try {
        await api.deleteChore(choreId);
        showAlert('Chore deleted successfully', 'success');
        await loadChores();
        await loadDashboardStats();
    } catch (error) {
        showAlert('Failed to delete chore: ' + error.message, 'error');
    }
}

// Completions Management Functions
async function loadCompletions() {
    const loadingEl = document.getElementById('completions-loading');
    const containerEl = document.getElementById('completions-table-container');

    try {
        loadingEl.classList.remove('hidden');
        containerEl.classList.add('hidden');

        // Get filter values
        const choreId = document.getElementById('completions-chore-filter').value;
        const userId = document.getElementById('completions-user-filter').value;
        const limit = document.getElementById('completions-limit').value;

        // Build query params
        const params = { limit: parseInt(limit) };
        if (choreId) params.chore_id = parseInt(choreId);
        if (userId) params.user_id = parseInt(userId);

        // Fetch completions
        const completions = await api.getCompletions(params);

        // Load chores and users for display (if not already loaded)
        if (chores.length === 0) {
            chores = await api.getChores();
        }
        if (users.length === 0) {
            users = await api.getUsers();
        }

        // Populate filter dropdowns if empty
        populateCompletionFilters();

        // Sort completions by completed_at date
        completions.sort((a, b) => {
            const dateA = new Date(a.completed_at);
            const dateB = new Date(b.completed_at);
            return completionsSortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        loadingEl.classList.add('hidden');
        containerEl.classList.remove('hidden');

        // Render completions table
        if (completions.length === 0) {
            containerEl.innerHTML = '<p style="padding: 2rem; text-align: center; color: #999;">No completion records found.</p>';
            return;
        }

        const sortIcon = completionsSortOrder === 'asc' ? '↑' : '↓';
        const sortLabel = completionsSortOrder === 'asc' ? 'Oldest First' : 'Newest First';

        containerEl.innerHTML = `
            <div style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th style="vertical-align: bottom;">ID</th>
                            <th style="vertical-align: bottom;">Chore</th>
                            <th style="vertical-align: bottom;">User</th>
                            <th style="vertical-align: bottom;">
                                <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                    <button
                                        onclick="toggleCompletionsSort()"
                                        class="btn btn-sm btn-secondary"
                                        style="padding: 0.25rem 0.5rem; font-size: 0.75rem; white-space: nowrap;">
                                        ${sortIcon} ${sortLabel}
                                    </button>
                                    <span>Completed At</span>
                                </div>
                            </th>
                            <th style="vertical-align: bottom;">Week Start</th>
                            <th style="vertical-align: bottom;">Notes</th>
                            <th style="vertical-align: bottom;">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${completions.map(completion => {
                            const chore = chores.find(c => c.id === completion.chore_id);
                            const user = users.find(u => u.id === completion.user_id);
                            const completedDate = new Date(completion.completed_at);
                            const formattedDate = completedDate.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            return `
                                <tr>
                                    <td>${completion.id}</td>
                                    <td><a href="#" onclick="editCompletion(${completion.id}); return false;" style="color: #4A90E2; text-decoration: underline; cursor: pointer;">${chore ? chore.name : `Chore #${completion.chore_id}`}</a></td>
                                    <td>${user ? user.name : `User #${completion.user_id}`}</td>
                                    <td>${formattedDate}</td>
                                    <td>${completion.week_start}</td>
                                    <td>${completion.notes || '-'}</td>
                                    <td>
                                        <button onclick="deleteCompletionConfirm(${completion.id})" class="btn btn-sm btn-danger">Delete</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            <p style="padding: 1rem; font-size: 0.875rem; color: #666;">Showing ${completions.length} records</p>
        `;

    } catch (error) {
        loadingEl.classList.add('hidden');
        showAlert('Failed to load completions: ' + error.message, 'error');
    }
}

function populateCompletionFilters() {
    // Populate chore filter
    const choreFilter = document.getElementById('completions-chore-filter');
    if (choreFilter.options.length === 1) { // Only has "All Chores"
        chores.forEach(chore => {
            const option = document.createElement('option');
            option.value = chore.id;
            option.textContent = chore.name;
            choreFilter.appendChild(option);
        });
    }

    // Populate user filter
    const userFilter = document.getElementById('completions-user-filter');
    if (userFilter.options.length === 1) { // Only has "All Users"
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            userFilter.appendChild(option);
        });
    }
}

function toggleCompletionsSort() {
    completionsSortOrder = completionsSortOrder === 'asc' ? 'desc' : 'asc';
    loadCompletions();
}

async function deleteCompletionConfirm(completionId) {
    if (!confirm(`Are you sure you want to delete this completion record (ID: ${completionId})? This action cannot be undone.`)) {
        return;
    }

    try {
        await api.deleteCompletion(completionId);
        showAlert('Completion record deleted successfully', 'success');
        await loadCompletions();
        await loadDashboardStats();
    } catch (error) {
        showAlert('Failed to delete completion: ' + error.message, 'error');
    }
}

// Completion Edit Modal Functions
async function editCompletion(completionId) {
    // Get completions list to find the specific completion
    const params = { limit: 10000 }; // Get all to find this one
    const completions = await api.getCompletions(params);
    const completion = completions.find(c => c.id === completionId);

    if (!completion) {
        showAlert('Completion record not found', 'error');
        return;
    }

    editingCompletionId = completionId;

    // Get the chore for this completion
    const chore = chores.find(c => c.id === completion.chore_id);

    // Populate form
    document.getElementById('completion-chore-name').value = chore ? chore.name : `Chore #${completion.chore_id}`;

    // Populate user dropdown
    const userSelect = document.getElementById('completion-user');
    userSelect.innerHTML = '<option value="">Select user...</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        if (user.id === completion.user_id) {
            option.selected = true;
        }
        userSelect.appendChild(option);
    });

    // Parse completed_at datetime
    const completedAt = new Date(completion.completed_at);
    const dateStr = completedAt.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = completedAt.toTimeString().slice(0, 5); // HH:MM

    document.getElementById('completion-date').value = dateStr;
    document.getElementById('completion-time').value = timeStr;
    document.getElementById('completion-week-start').value = completion.week_start;
    document.getElementById('completion-notes').value = completion.notes || '';

    // Show modal
    document.getElementById('completion-modal').classList.add('active');
}

function closeCompletionModal() {
    document.getElementById('completion-modal').classList.remove('active');
    editingCompletionId = null;
}

async function saveCompletion(event) {
    event.preventDefault();

    if (!editingCompletionId) return;

    // Get form values
    const userId = parseInt(document.getElementById('completion-user').value);
    const dateStr = document.getElementById('completion-date').value;
    const timeStr = document.getElementById('completion-time').value;
    const notes = document.getElementById('completion-notes').value || null;

    // Combine date and time into ISO datetime string
    const completedAt = new Date(`${dateStr}T${timeStr}`).toISOString();

    const completionData = {
        user_id: userId,
        completed_at: completedAt,
        notes: notes
    };

    try {
        await api.updateCompletion(editingCompletionId, completionData);
        showAlert('Completion updated successfully', 'success');
        closeCompletionModal();
        await loadCompletions();
        await loadDashboardStats();
    } catch (error) {
        showAlert('Failed to update completion: ' + error.message, 'error');
    }
}
