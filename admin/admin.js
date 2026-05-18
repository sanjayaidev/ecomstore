// admin/admin.js
const CONFIG = {
  loginUrl: '/api/login',
  productsUrl: '/api/products',
  tokenKey: 'admin_token',
  adminEmail: 'sanjay@mystore.com',
  adminPassword: 'sanjay@123'
};

// DOM Elements
const elements = {
  loginModal: document.getElementById('loginModal') || createLoginModal(),
  loginForm: document.getElementById('loginForm'),
  logoutBtn: document.getElementById('logoutBtn'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  sidebar: document.getElementById('adminSidebar'),
  navItems: document.querySelectorAll('.nav-item'),
  sections: document.querySelectorAll('.admin-section'),
  productsTableBody: document.getElementById('productsTableBody'),
  productSearch: document.getElementById('productSearch'),
  categoryFilter: document.getElementById('categoryFilter'),
  addProductBtn: document.getElementById('addProductBtn'),
  productModal: document.getElementById('productModal'),
  productForm: document.getElementById('productForm'),
  closeProductModal: document.getElementById('closeProductModal'),
  cancelProductModal: document.getElementById('cancelProductModal'),
  sizesContainer: document.getElementById('sizesContainer'),
  addSizeRow: document.getElementById('addSizeRow'),
  deleteModal: document.getElementById('deleteModal'),
  deleteItemName: document.getElementById('deleteItemName'),
  cancelDelete: document.getElementById('cancelDelete'),
  confirmDelete: document.getElementById('confirmDelete'),
  toastContainer: document.getElementById('toastContainer'),
  statProducts: document.getElementById('stat-products'),
  statOrders: document.getElementById('stat-orders'),
  statRevenue: document.getElementById('stat-revenue'),
  statStock: document.getElementById('stat-stock')
};

// State
let state = {
  token: localStorage.getItem(CONFIG.tokenKey),
  products: [],
  editingId: null,
  deleteTarget: null
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', init);

function init() {
  if (!state.token) {
    elements.loginModal.showModal();
    return;
  }
  setupNavigation();
  setupProductModal();
  setupSizeInputs();
  setupSearchFilters();
  setupMobileMenu();
  setupLogout();
  fetchProducts();
  updateDashboardStats();
}

// --- AUTH ---
function createLoginModal() {
  const modal = document.createElement('dialog');
  modal.id = 'loginModal';
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 style="margin-bottom:20px;text-align:center;">🔐 Admin Login</h3>
      <form id="loginForm" class="modal-form" style="padding:0;">
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="loginEmail" required value="${CONFIG.adminEmail}">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="loginPassword" required value="${CONFIG.adminPassword}">
        </div>
        <button type="submit" class="btn-primary" style="width:100%;">Login</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  
  modal.querySelector('#loginForm').addEventListener('submit', handleLogin);
  return modal;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = 'Authenticating...';
  btn.disabled = true;

  try {
    const res = await fetch(CONFIG.loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: document.getElementById('loginEmail').value,
        password: document.getElementById('loginPassword').value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    state.token = data.token;
    localStorage.setItem(CONFIG.tokenKey, state.token);
    elements.loginModal.close();
    init();
  } catch (err) {
    showToast(err.message, 'error');
    btn.textContent = 'Login';
    btn.disabled = false;
  }
}

function setupLogout() {
  if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
      localStorage.removeItem(CONFIG.tokenKey);
      location.reload();
    });
  }
}

// --- NAVIGATION ---
function setupNavigation() {
  elements.navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.navItems.forEach(b => b.classList.remove('active'));
      elements.sections.forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.dataset.section);
      if (target) target.classList.add('active');
      if (window.innerWidth < 768) elements.sidebar.classList.remove('open');
    });
  });
}

function setupMobileMenu() {
  if (elements.mobileMenuBtn) {
    elements.mobileMenuBtn.addEventListener('click', () => {
      elements.sidebar.classList.toggle('open');
    });
    document.addEventListener('click', (e) => {
      if (!elements.sidebar.contains(e.target) && e.target !== elements.mobileMenuBtn) {
        elements.sidebar.classList.remove('open');
      }
    });
  }
}

// --- PRODUCTS ---
async function fetchProducts() {
  try {
    elements.productsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading...</td></tr>';
    const res = await fetch(CONFIG.productsUrl);
    if (!res.ok) throw new Error('Failed to fetch products');
    state.products = await res.json();
    renderProducts(state.products);
  } catch (err) {
    elements.productsTableBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:#ef4444">${err.message}</td></tr>`;
  }
}

function renderProducts(products) {
  if (products.length === 0) {
    elements.productsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No products found</td></tr>';
    return;
  }

  elements.productsTableBody.innerHTML = products.map(p => {
    const stock = p.sizes ? p.sizes.reduce((acc, s) => acc + (s.stock || 0), 0) : 0;
    let status = 'Active';
    if (stock === 0) status = 'Out of Stock';
    else if (stock < 5) status = 'Low Stock';
    
    const statusClass = status === 'Active' ? 'status-active' : 
                       status === 'Low Stock' ? 'status-pending' : 'status-out-of-stock';

    return `
      <tr>
        <td><input type="checkbox" class="row-check" data-id="${p.id}"></td>
        <td><img src="${p.image_1}" alt="${p.title}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.src='/images/placeholder.webp'"></td>
        <td><strong>${p.title}</strong></td>
        <td>${p.category}</td>
        <td>₹${p.price}</td>
        <td>${stock} units</td>
        <td><span class="status-badge ${statusClass}">${status}</span></td>
        <td>
          <button class="btn-sm btn-primary edit-btn" data-id="${p.id}">Edit</button>
          <button class="btn-sm btn-danger delete-btn" data-id="${p.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  // Attach dynamic listeners
  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openProductModal(btn.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => openDeleteModal(btn.dataset.id)));
}

function setupSearchFilters() {
  const filter = () => {
    const search = elements.productSearch?.value.toLowerCase() || '';
    const cat = elements.categoryFilter?.value || '';
    const filtered = state.products.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search);
      const matchCat = !cat || p.category.toLowerCase() === cat;
      return matchSearch && matchCat;
    });
    renderProducts(filtered);
  };
  if (elements.productSearch) elements.productSearch.addEventListener('input', filter);
  if (elements.categoryFilter) elements.categoryFilter.addEventListener('change', filter);
}

// --- MODALS & FORMS ---
function setupProductModal() {
  if (elements.addProductBtn) elements.addProductBtn.addEventListener('click', () => openProductModal());
  if (elements.closeProductModal) elements.closeProductModal.addEventListener('click', closeProductModal);
  if (elements.cancelProductModal) elements.cancelProductModal.addEventListener('click', closeProductModal);
  
  elements.productForm.addEventListener('submit', handleProductSubmit);
}

function openProductModal(id = null) {
  state.editingId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit Product' : 'Add Product';
  elements.productForm.reset();
  elements.sizesContainer.innerHTML = '';
  addSizeRow(); // Default size row

  if (id) {
    const product = state.products.find(p => p.id === id);
    if (product) {
      document.getElementById('productId').value = product.id;
      document.getElementById('productTitle').value = product.title;
      document.getElementById('productCategory').value = product.category.toLowerCase();
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productDiscount').value = product.discount_price || '';
      document.getElementById('productDescription').value = product.description || '';
      document.getElementById('image1').value = product.image_1 || '';
      document.getElementById('image2').value = product.image_2 || '';
      document.getElementById('image3').value = product.image_3 || '';
      document.getElementById('productKeywords').value = product.keywords ? product.keywords.join(', ') : '';
      elements.sizesContainer.innerHTML = '';
      if (product.sizes) product.sizes.forEach(s => addSizeRow(s.name, s.stock));
    }
  }
  elements.productModal.showModal();
}

function closeProductModal() {
  elements.productModal.close();
  state.editingId = null;
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  const sizes = [];
  elements.sizesContainer.querySelectorAll('.size-row').forEach(row => {
    const name = row.querySelector('.size-name').value.trim();
    const stock = parseInt(row.querySelector('.size-stock').value) || 0;
    if (name) sizes.push({ name, stock });
  });

  const data = {
    id: state.editingId || undefined,
    title: document.getElementById('productTitle').value,
    category: document.getElementById('productCategory').value,
    price: parseFloat(document.getElementById('productPrice').value),
    discount_price: document.getElementById('productDiscount').value ? parseFloat(document.getElementById('productDiscount').value) : null,
    description: document.getElementById('productDescription').value,
    image_1: document.getElementById('image1').value,
    image_2: document.getElementById('image2').value,
    image_3: document.getElementById('image3').value,
    sizes: JSON.stringify(sizes),
    keywords: document.getElementById('productKeywords').value.split(',').map(k => k.trim()).filter(Boolean)
  };

  try {
    // Placeholder: Will connect to POST/PUT API next step
    showToast(state.editingId ? 'Product update queued (API next)' : 'Product added (API next)', 'success');
    closeProductModal();
    fetchProducts();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.textContent = 'Save Product';
    btn.disabled = false;
  }
}

function setupSizeInputs() {
  window.addSizeRow = (name = 'S', stock = 10) => {
    const row = document.createElement('div');
    row.className = 'size-row';
    row.style.cssText = 'display:flex;gap:10px;margin-bottom:10px;align-items:center;';
    row.innerHTML = `
      <input type="text" class="size-name" value="${name}" placeholder="Size" style="flex:1;padding:8px;border:1px solid #e5e7eb;border-radius:6px;">
      <input type="number" class="size-stock" value="${stock}" placeholder="Stock" min="0" style="width:80px;padding:8px;border:1px solid #e5e7eb;border-radius:6px;">
      <button type="button" onclick="this.parentElement.remove()" style="width:32px;height:32px;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;cursor:pointer;font-weight:bold;">×</button>
    `;
    elements.sizesContainer.appendChild(row);
  };
  if (elements.addSizeRow) elements.addSizeRow.addEventListener('click', () => addSizeRow());
}

// --- DELETE MODAL ---
function openDeleteModal(id) {
  const product = state.products.find(p => p.id === id);
  state.deleteTarget = id;
  elements.deleteItemName.textContent = product?.title || 'this item';
  elements.deleteModal.showModal();
}

elements.confirmDelete?.addEventListener('click', async () => {
  if (!state.deleteTarget) return;
  // Placeholder: Will connect to DELETE API next step
  showToast('Delete queued (API next)', 'success');
  elements.deleteModal.close();
  fetchProducts();
  state.deleteTarget = null;
});
elements.cancelDelete?.addEventListener('click', () => {
  elements.deleteModal.close();
  state.deleteTarget = null;
});

// --- DASHBOARD ---
function updateDashboardStats() {
  const p = state.products;
  if (elements.statProducts) elements.statProducts.textContent = p.length;
  if (elements.statOrders) elements.statOrders.textContent = '0'; // Will update when orders API is ready
  if (elements.statRevenue) elements.statRevenue.textContent = '₹0';
  if (elements.statStock) elements.statStock.textContent = p.filter(prod => {
    const totalStock = prod.sizes?.reduce((a,s) => a + (s.stock||0), 0) || 0;
    return totalStock < 5;
  }).length;
}

// --- TOAST UTILITY ---
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}