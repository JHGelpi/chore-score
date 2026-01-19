/**
 * Login Page JavaScript
 */

// Load users on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadUsers();
});

async function loadUsers() {
    const loadingEl = document.getElementById('users-loading');
    const gridEl = document.getElementById('users-grid');

    try {
        const users = await api.getUsers({ is_active: true });

        // Hide loading
        loadingEl.classList.add('hidden');
        gridEl.classList.remove('hidden');

        // Clear grid
        gridEl.innerHTML = '';

        if (users.length === 0) {
            gridEl.innerHTML = '<p class="text-center">No users found. Please contact an administrator.</p>';
            return;
        }

        // Render user cards
        users.forEach(user => {
            const card = createUserCard(user);
            gridEl.appendChild(card);
        });

    } catch (error) {
        loadingEl.classList.add('hidden');
        showAlert('Failed to load users: ' + error.message, 'error');
    }
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    card.onclick = () => selectUser(user);

    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.textContent = getInitials(user.name);

    const name = document.createElement('div');
    name.className = 'user-name';
    name.textContent = user.name;

    const role = document.createElement('div');
    role.className = 'chore-description';
    role.textContent = user.is_admin ? 'Administrator' : 'User';

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(role);

    return card;
}

function selectUser(user) {
    // Store user in session
    setCurrentUser(user);

    // Show success message
    showAlert(`Welcome, ${user.name}!`, 'success');

    // Redirect to weekly view
    setTimeout(() => {
        window.location.href = '/weekly';
    }, 500);
}
