/**
 * API Client for Chores Management App
 */

const API_BASE = '/api';

class APIClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Users
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/users${queryString ? '?' + queryString : ''}`);
    }

    async getUser(userId) {
        return this.request(`/users/${userId}`);
    }

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(userId, userData) {
        return this.request(`/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(userId) {
        return this.request(`/users/${userId}`, {
            method: 'DELETE'
        });
    }

    // Chores
    async getChores(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/chores${queryString ? '?' + queryString : ''}`);
    }

    async getWeeklyChores(weekStart = null, userId = null, frequency = null) {
        const params = new URLSearchParams();
        if (weekStart) params.append('week_start', weekStart);
        if (userId) params.append('user_id', userId);
        if (frequency) params.append('frequency', frequency);
        const url = `/chores/weekly${params.toString() ? '?' + params.toString() : ''}`;
        console.log('API call to:', url);
        return this.request(url);
    }

    async getChore(choreId) {
        return this.request(`/chores/${choreId}`);
    }

    async createChore(choreData) {
        return this.request('/chores', {
            method: 'POST',
            body: JSON.stringify(choreData)
        });
    }

    async updateChore(choreId, choreData) {
        return this.request(`/chores/${choreId}`, {
            method: 'PUT',
            body: JSON.stringify(choreData)
        });
    }

    async deleteChore(choreId) {
        return this.request(`/chores/${choreId}`, {
            method: 'DELETE'
        });
    }

    async getAdhocChoreNames() {
        return this.request('/chores/adhoc/names');
    }

    async createAdhocChore(adhocChoreData) {
        return this.request('/chores/adhoc', {
            method: 'POST',
            body: JSON.stringify(adhocChoreData)
        });
    }

    // Completions
    async markComplete(completionData) {
        return this.request('/completions', {
            method: 'POST',
            body: JSON.stringify(completionData)
        });
    }

    async getCompletions(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/completions${queryString ? '?' + queryString : ''}`);
    }

    async updateCompletion(completionId, completionData) {
        return this.request(`/completions/${completionId}`, {
            method: 'PUT',
            body: JSON.stringify(completionData)
        });
    }

    async deleteCompletion(completionId) {
        return this.request(`/completions/${completionId}`, {
            method: 'DELETE'
        });
    }

    async getCompletionStats(userId = null) {
        const params = userId ? `?user_id=${userId}` : '';
        return this.request(`/completions/stats${params}`);
    }

    // Admin
    async getDashboardStats() {
        return this.request('/admin/stats/dashboard');
    }

    async getHealthCheck() {
        return this.request('/admin/health');
    }
}

// Create global API instance
const api = new APIClient();

// Utility Functions
function showAlert(message, type = 'info') {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;

    container.innerHTML = '';
    container.appendChild(alert);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

function formatWeekRange(weekStart) {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Session Management
function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    return userJson ? JSON.parse(userJson) : null;
}

function setCurrentUser(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem('currentUser');
}

function logout() {
    clearCurrentUser();
    window.location.href = '/login';
}

// Check if user is logged in
function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/login';
        return null;
    }
    return user;
}
