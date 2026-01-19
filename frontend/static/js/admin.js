/**
 * Admin Console JavaScript
 */

let users = [];
let chores = [];
let editingUserId = null;
let editingChoreId = null;

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

    document.getElementById('chore-modal').classList.add('active');
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

    // Populate user dropdown
    populateUserDropdown();
    document.getElementById('chore-assigned-user').value = chore.assigned_user_id || '';

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
