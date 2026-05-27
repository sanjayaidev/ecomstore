// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Setup navigation
    setupNavigation();
    
    // Load dashboard data
    loadDashboardData();
    
    // Setup logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
});

// Check if user is authenticated
function checkAuth() {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin || isAdmin !== 'true') {
        window.location.href = 'login.html';
        return false;
    }
    
    // Load admin name if available
    const adminName = localStorage.getItem('adminName');
    if (adminName) {
        document.getElementById('admin-name').textContent = adminName;
    }
    
    return true;
}

// Setup navigation between sections
function setupNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav a[data-section]');
    const sections = document.querySelectorAll('.admin-section');
    const pageTitle = document.getElementById('page-title');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Get section name
            const sectionName = this.getAttribute('data-section');
            
            // Update page title
            pageTitle.textContent = this.querySelector('span').textContent;
            
            // Show corresponding section
            sections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });
            
            const targetSection = document.getElementById(`${sectionName}-section`);
            if (targetSection) {
                targetSection.style.display = 'block';
                setTimeout(() => targetSection.classList.add('active'), 10);
                
                // Load section-specific data if needed
                if (sectionName === 'cms') {
                    loadCmsData();
                } else if (sectionName === 'dashboard') {
                    loadDashboardData();
                }
            }
        });
    });
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        // In a real app, these would come from API endpoints
        // For now, we'll use mock data or empty states
        
        document.getElementById('total-products').textContent = '0';
        document.getElementById('total-orders').textContent = '0';
        document.getElementById('total-customers').textContent = '0';
        document.getElementById('revenue').textContent = '₹0';
        
        // Load recent orders
        const ordersBody = document.getElementById('recent-orders-body');
        ordersBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">No recent orders found</td>
            </tr>
        `;
        
        // In production, fetch from API:
        // const response = await fetch('/api/admin/dashboard');
        // const data = await response.json();
        // updateDashboardUI(data);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Failed to load dashboard data', true);
    }
}

// Handle logout
function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('adminName');
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
    }
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show';
    if (isError) {
        toast.classList.add('error');
    }
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Helper function to format currency
function formatCurrency(amount) {
    return '₹' + parseFloat(amount).toLocaleString('en-IN');
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
}

// Global function to be used by other scripts
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;