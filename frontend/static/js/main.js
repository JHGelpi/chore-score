// Main JavaScript for Chores Management App

// Check API status on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/health');
        const data = await response.json();

        const statusElement = document.getElementById('api-status');
        if (data.status === 'healthy') {
            statusElement.textContent = 'API is running!';
            statusElement.style.color = '#7ed321';
        } else {
            statusElement.textContent = 'API status unknown';
            statusElement.style.color = '#f5a623';
        }
    } catch (error) {
        const statusElement = document.getElementById('api-status');
        statusElement.textContent = 'API is not reachable';
        statusElement.style.color = '#d0021b';
        console.error('Error checking API status:', error);
    }
});
