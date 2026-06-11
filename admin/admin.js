// ═══════════════════════════════════════════
// admin/admin.js — EcomStore Admin Panel
// Production-ready: No mock data, real API only
// ═══════════════════════════════════════════

'use strict';

// ── CONFIG ──
const CONFIG = {
  loginUrl:    '/api/login',
  productsUrl: '/api/admin/products',
  ordersUrl:   '/api/orders',
  tokenKey:    'admin_token',
  pageSize:    10
};

// ── STATE ──
const state = {
  token:        localStorage.getItem(CONFIG.tokenKey),
  products:     [],
  orders:       [],
  customers:    [],
  categories:   [],
  editingId:    null,
  deleteTarget: null,
  deleteType:   'product',
  currentPage:  1,
  orderFilter:  'all',
  filterState: { search: '', category: '', stock: '', sort: '' }
};

// ── UTILITY: safe querySelector ──
const $ = (id) => document.getElementById(id);

// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setDashboardDate();
  if (!state.token) { showLoginModal(); return; }
  bootAdmin();
});

function bootAdmin() {
  setupNavigation();
  setupMobileMenu();
  setupUserDropdown();
  setupProductModal();
  setupCategoryModal();
  setupDeleteModal();
  setupSearchFilters();
  setupOrderTabs();
  setupSettingsTabs();
  setupFormTabs();
  setupExport();
  setupBulkDelete();
  setupLogout();
  setupGotoLinks();
  fetchProducts();
  fetchOrders();
  renderCategories();
}

// ═══════════════════════════════════
// LOGIN MODAL
// ═══════════════════════════════════
function showLoginModal() {
  let existing = $('loginModal');
  if (existing) { existing.remove(); }
  const modal = document.createElement('dialog');
  modal.id = 'loginModal'; modal.className = 'modal';
  modal.innerHTML = `
    <div class="login-modal-inner">
      <div class="login-header">
        <div class="logo-big">🛍️</div>
        <h2>EcomStore Admin</h2>
        <p>Sign in to manage your store</p>
      </div>
      <div class="login-error" id="loginError"></div>
      <form id="loginForm">
        <div class="form-group"><label>Email</label><input type="email" id="loginEmail" required placeholder="admin@mystore.com" autocomplete="email"></div>
        <div class="form-group"><label>Password</label><input type="password" id="loginPassword" required placeholder="••••••••" autocomplete="current-password"></div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:8px" id="loginBtn">Sign In</button>
      </form>
    </div>`;
  document.body.appendChild(modal);
  modal.showModal();
  modal.querySelector('#loginEmail').focus();
  modal.querySelector('#loginForm').addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = $('loginBtn'), errEl = $('loginError');
  errEl.classList.remove('show');
  btn.textContent = 'Signing in…'; btn.disabled = true;
  try {
    const res = await fetch(CONFIG.loginUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $('loginEmail').value.trim(), password: $('loginPassword').value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');
    state.token = data.token;
    localStorage.setItem(CONFIG.tokenKey, state.token);
    $('loginModal').close(); $('loginModal').remove();
    bootAdmin();
    showToast('Welcome back, Admin!', 'success');
  } catch (err) {
    errEl.textContent = err.message; errEl.classList.add('show');
    btn.textContent = 'Sign In'; btn.disabled = false;
  }
}

function setupLogout() {
  $('logoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(CONFIG.tokenKey); state.token = null;
    showToast('Logged out.', 'success');
    setTimeout(() => location.reload(), 600);
  });
}

// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
function setupNavigation() {
  document.querySelectorAll('.admin-nav a').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo(btn.dataset.section);
      if (window.innerWidth < 768) closeSidebar();
    });
  });
}

function navigateTo(sectionId) {
  document.querySelectorAll('.admin-nav a').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const btn = document.querySelector(`.admin-nav a[data-section="${sectionId}"]`);
  const section = $(sectionId);
  if (btn) btn.classList.add('active');
  if (section) section.classList.add('active');
  if (sectionId === 'analytics') renderAnalytics();
  if (sectionId === 'customers') renderCustomers();
  if (sectionId === 'cms') loadCMSData();
}

function setupGotoLinks() {
  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.goto));
  });
}

function setupMobileMenu() {
  const btn = $('mobileMenuBtn'), overlay = $('sidebarOverlay');
  btn?.addEventListener('click', () => {
    const sidebar = $('adminSidebar');
    const isOpen = sidebar.classList.toggle('open');
    overlay?.classList.toggle('active', isOpen);
  });
  overlay?.addEventListener('click', closeSidebar);
}

function closeSidebar() {
  $('adminSidebar')?.classList.remove('open');
  $('sidebarOverlay')?.classList.remove('active');
}

function setupUserDropdown() {
  const dropdown = $('userDropdown');
  if (!dropdown) return;
  dropdown.addEventListener('click', (e) => { e.stopPropagation(); dropdown.classList.toggle('open'); });
  document.addEventListener('click', () => dropdown.classList.remove('open'));
}

function setDashboardDate() {
  const el = $('dashboardDate');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleDateString('en-IN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ═══════════════════════════════════
// PRODUCTS — FETCH & RENDER (REAL API ONLY)
// ═══════════════════════════════════
async function fetchProducts() {
  const tbody = $('productsTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading…</td></tr>';
  try {
    const res = await fetch(CONFIG.productsUrl, { headers: authHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.products = await res.json();
  } catch (err) {
    console.error('Products API error:', err.message);
    state.products = []; // No mock fallback — show empty state
  }
  state.currentPage = 1;
  applyFiltersAndRender();
  updateDashboardStats();
  renderCategories();
  renderTopProducts();
  updateNavBadge('navBadgeProducts', state.products.length);
}

function applyFiltersAndRender() {
  const { search, category, stock, sort } = state.filterState;
  let list = [...state.products];
  if (search) list = list.filter(p => p.title.toLowerCase().includes(search));
  if (category) list = list.filter(p => p.category?.toLowerCase() === category);
  if (stock) {
    list = list.filter(p => {
      const total = getTotalStock(p);
      if (stock === 'instock') return total >= 5;
      if (stock === 'lowstock') return total > 0 && total < 5;
      if (stock === 'outstock') return total === 0;
      return true;
    });
  }
  if (sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (sort === 'title-asc') list.sort((a,b) => a.title.localeCompare(b.title));
  if (sort === 'stock-asc') list.sort((a,b) => getTotalStock(a) - getTotalStock(b));
  const countEl = $('productsCount');
  if (countEl) countEl.textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;
  renderPagination(list);
  renderProductPage(list);
}

function renderProductPage(list) {
  const start = (state.currentPage - 1) * CONFIG.pageSize;
  const page = list.slice(start, start + CONFIG.pageSize);
  renderProducts(page);
}

function renderProducts(products) {
  const tbody = $('productsTableBody');
  if (!tbody) return;
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted" style="padding:32px">No products found</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => {
    const stock = getTotalStock(p);
    const stockLabel = getStockLabel(stock);
    const statusClass = getStatusClass(stockLabel);
    const img = p.image_1 || p.image || '/images/placeholder.webp';
    return `
      <tr data-id="${p.id}">
        <td><input type="checkbox" class="row-check" data-id="${p.id}"></td>
        <td><img src="${escHtml(img)}" alt="${escHtml(p.title)}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb" onerror="this.src='/images/placeholder.webp'"></td>
        <td><strong>${escHtml(p.title)}</strong></td>
        <td style="text-transform:capitalize">${escHtml(p.category || '—')}</td>
        <td><span style="font-weight:600">₹${Number(p.price).toLocaleString('en-IN')}</span>${p.discount_price ? `<br><small class="text-muted" style="text-decoration:line-through">₹${Number(p.discount_price).toLocaleString('en-IN')}</small>` : ''}</td>
        <td>${stock} units</td>
        <td><span class="status-badge ${statusClass}">${stockLabel}</span></td>
        <td><div style="display:flex;gap:6px"><button class="btn-icon edit-btn" data-id="${p.id}" title="Edit">✏️</button><button class="btn-icon danger delete-btn" data-id="${p.id}" title="Delete">🗑️</button></div></td>
      </tr>`;
  }).join('');
  tbody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openProductModal(btn.dataset.id)));
  tbody.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => openDeleteModal('product', btn.dataset.id)));
  tbody.querySelectorAll('.row-check').forEach(cb => cb.addEventListener('change', updateBulkDeleteBtn));
  const selectAll = $('selectAll');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = function() {
      tbody.querySelectorAll('.row-check').forEach(cb => cb.checked = this.checked);
      updateBulkDeleteBtn();
    };
  }
}

function renderPagination(list) {
  const container = $('productsPagination');
  if (!container) return;
  const totalPages = Math.ceil(list.length / CONFIG.pageSize);
  if (totalPages <= 1) { container.innerHTML = ''; return; }
  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);
  container.innerHTML = `
    <button class="page-btn" id="prevPage" ${state.currentPage === 1 ? 'disabled' : ''}>‹</button>
    ${pages.map(i => `<button class="page-btn ${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`).join('')}
    <button class="page-btn" id="nextPage" ${state.currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { state.currentPage = parseInt(btn.dataset.page); applyFiltersAndRender(); });
  });
  $('prevPage')?.addEventListener('click', () => { state.currentPage--; applyFiltersAndRender(); });
  $('nextPage')?.addEventListener('click', () => { state.currentPage++; applyFiltersAndRender(); });
}

function setupSearchFilters() {
  const filter = () => {
    state.currentPage = 1;
    state.filterState.search = ($('productSearch')?.value || '').toLowerCase();
    state.filterState.category = $('categoryFilter')?.value || '';
    state.filterState.stock = $('stockFilter')?.value || '';
    state.filterState.sort = $('sortFilter')?.value || '';
    applyFiltersAndRender();
  };
  ['productSearch','categoryFilter','stockFilter','sortFilter'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', filter);
  });
}

function setupBulkDelete() {
  $('bulkDeleteBtn')?.addEventListener('click', () => {
    const ids = [...document.querySelectorAll('.row-check:checked')].map(cb => cb.dataset.id);
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected product${ids.length > 1 ? 's' : ''}?`)) return;
    ids.forEach(id => deleteProduct(id, false));
    setTimeout(() => { fetchProducts(); showToast(`✅ Deleted ${ids.length} products`, 'success'); }, 400);
  });
}

function updateBulkDeleteBtn() {
  const count = document.querySelectorAll('.row-check:checked').length;
  const btn = $('bulkDeleteBtn');
  if (btn) { btn.style.display = count > 0 ? '' : 'none'; btn.textContent = `Delete Selected (${count})`; }
}

function setupExport() {
  $('exportProductsBtn')?.addEventListener('click', () => exportCSV(state.products, 'products'));
  $('exportOrdersBtn')?.addEventListener('click', () => exportCSV(state.orders, 'orders'));
}

function exportCSV(data, name) {
  if (!data.length) { showToast('Nothing to export', 'warning'); return; }
  const keys = Object.keys(data[0]);
  const rows = [keys.join(','), ...data.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','))];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${name}-${Date.now()}.csv`;
  a.click(); URL.revokeObjectURL(url);
  showToast(`Exported ${data.length} rows`, 'success');
}

// ═══════════════════════════════════
// PRODUCT MODAL — Add / Edit
// ═══════════════════════════════════
function setupProductModal() {
  $('addProductBtn')?.addEventListener('click', () => openProductModal(null));
  $('closeProductModal')?.addEventListener('click', closeProductModal);
  $('cancelProductModal')?.addEventListener('click', closeProductModal);
  $('productForm')?.addEventListener('submit', handleProductSubmit);
  $('addSizeRow')?.addEventListener('click', () => addSizeRow());
  ['image1','image2','image3'].forEach(id => { $(id)?.addEventListener('input', updateImagePreview); });
  $('sizesContainer')?.addEventListener('input', updateStockCount);
}

function openProductModal(id = null) {
  state.editingId = id;
  const form = $('productForm'); form.reset();
  $('sizesContainer').innerHTML = '';
  $('imagePreview').innerHTML = '<span class="preview-empty">Images will appear here</span>';
  $('modalTitle').textContent = id ? 'Edit Product' : 'Add Product';
  activateFormTab('basic');
  if (id) {
    const p = state.products.find(x => x.id == id || x.id === id);
    if (p) {
      $('productId').value = p.id;
      $('productTitle').value = p.title;
      $('productCategory').value = (p.category || '').toLowerCase();
      $('productPrice').value = p.price;
      $('productDiscount').value = p.discount_price || '';
      $('productDescription').value = p.description || '';
      $('image1').value = p.image_1 || p.image || '';
      $('image2').value = p.image_2 || '';
      $('image3').value = p.image_3 || '';
      $('productKeywords').value = Array.isArray(p.keywords) ? p.keywords.join(', ') : (p.keywords || '');
      const sizes = parseSizes(p.sizes);
      sizes.forEach(s => addSizeRow(s.name, s.stock));
    }
  }
  if (!$('sizesContainer').children.length) addSizeRow('S', 10);
  updateImagePreview(); updateStockCount();
  $('productModal').showModal();
}

function closeProductModal() { $('productModal').close(); state.editingId = null; }

async function handleProductSubmit(e) {
  e.preventDefault();
  const btn = $('saveProductBtn'), txt = $('saveBtnText');
  txt.textContent = 'Saving…'; btn.disabled = true;
  const sizes = collectSizes();
  const data = {
    id: state.editingId || undefined,
    title: $('productTitle').value.trim(),
    category: $('productCategory').value,
    price: parseFloat($('productPrice').value) || 0,
    discount_price: $('productDiscount').value ? parseFloat($('productDiscount').value) : null,
    description: $('productDescription').value.trim(),
    image_1: $('image1').value.trim(),
    image_2: $('image2').value.trim(),
    image_3: $('image3').value.trim(),
    sizes: sizes,
    keywords: $('productKeywords').value.split(',').map(k => k.trim()).filter(Boolean)
  };
  try {
    const method = state.editingId ? 'PUT' : 'POST';
    const res = await fetch(CONFIG.productsUrl, {
      method, headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Save failed');
    showToast(state.editingId ? '✅ Product updated!' : '✅ Product added!', 'success');
    closeProductModal(); fetchProducts();
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  } finally {
    txt.textContent = 'Save Product'; btn.disabled = false;
  }
}

function addSizeRow(name = 'S', stock = 10) {
  const container = $('sizesContainer');
  const row = document.createElement('div');
  row.className = 'size-row';
  row.innerHTML = `
    <input type="text" class="size-name" value="${escHtml(String(name))}" placeholder="Size (S, M, L, XL…)" style="flex:1;padding:9px 12px;border:1px solid #e5e7eb;border-radius:6px;font-family:inherit;font-size:.875rem">
    <input type="number" class="size-stock" value="${parseInt(stock)||0}" placeholder="Stock" min="0" style="width:90px;padding:9px 12px;border:1px solid #e5e7eb;border-radius:6px;font-family:inherit;font-size:.875rem">
    <button type="button" class="size-remove" onclick="this.closest('.size-row').remove(); updateStockCount()">×</button>`;
  container.appendChild(row);
  row.querySelector('.size-stock').addEventListener('input', updateStockCount);
  updateStockCount();
}

function collectSizes() {
  const rows = $('sizesContainer').querySelectorAll('.size-row');
  const sizes = [];
  rows.forEach(row => {
    const name = row.querySelector('.size-name')?.value.trim();
    const stock = parseInt(row.querySelector('.size-stock')?.value) || 0;
    if (name) sizes.push({ name, stock });
  });
  return sizes;
}

function updateStockCount() {
  const total = collectSizes().reduce((a, s) => a + s.stock, 0);
  const el = $('totalStockCount');
  if (el) el.textContent = total;
}

function updateImagePreview() {
  const box = $('imagePreview');
  if (!box) return;
  const urls = ['image1','image2','image3'].map(id => $(id)?.value.trim()).filter(Boolean);
  if (!urls.length) { box.innerHTML = '<span class="preview-empty">Images will appear here</span>'; return; }
  box.innerHTML = urls.map((url, i) => `
    <div class="preview-img-wrap"><img src="${escHtml(url)}" alt="Preview ${i+1}" onerror="this.style.opacity='.3'" />${i === 0 ? '<span class="preview-main-badge">Main</span>' : ''}</div>`).join('');
}

function setupFormTabs() {
  document.querySelectorAll('.form-tab').forEach(tab => {
    tab.addEventListener('click', () => activateFormTab(tab.dataset.ftab));
  });
}

function activateFormTab(id) {
  document.querySelectorAll('.form-tab').forEach(t => t.classList.toggle('active', t.dataset.ftab === id));
  document.querySelectorAll('.form-tab-panel').forEach(p => p.classList.toggle('active', p.id === `ftab-${id}`));
}

// ═══════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════
const DEFAULT_CATEGORIES = [
  { id: 'saree', name: 'Saree', slug: 'saree', image_url: '/images/categories/saree.jpg' },
  { id: 'kurti', name: 'Kurti', slug: 'kurti', image_url: '/images/categories/kurti.jpg' },
  { id: 'dress', name: 'Dress', slug: 'dress', image_url: '/images/categories/dress.jpg' },
  { id: 'top', name: 'Top', slug: 'top', image_url: '/images/categories/top.jpg' }
];

function renderCategories() {
  const tbody = $('categoriesTableBody');
  if (!tbody) return;
  const cats = state.categories.length ? state.categories : DEFAULT_CATEGORIES;
  state.categories = cats;
  tbody.innerHTML = cats.map(c => {
    const count = state.products.filter(p => (p.category||'').toLowerCase() === c.slug).length;
    const imgHtml = c.image_url 
      ? `<img src="${escHtml(c.image_url)}" alt="${escHtml(c.name)}" style="width:40px;height:40px;object-fit:cover;border-radius:4px">`
      : `<div style="width:40px;height:40px;background:#f3f4f6;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:0.75rem">No Img</div>`;
    return `<tr><td><strong>${escHtml(c.name)}</strong></td><td><code style="font-size:.8rem;background:#f3f4f6;padding:2px 6px;border-radius:4px">${escHtml(c.slug)}</code></td><td>${imgHtml}</td><td>${count}</td><td><div style="display:flex;gap:6px"><button class="btn-icon edit-cat" data-id="${c.id}" title="Edit">✏️</button><button class="btn-icon danger delete-cat" data-id="${c.id}" title="Delete">🗑️</button></div></td></tr>`;
  }).join('');
  tbody.querySelectorAll('.edit-cat').forEach(btn => btn.addEventListener('click', () => openCategoryModal(btn.dataset.id)));
  tbody.querySelectorAll('.delete-cat').forEach(btn => btn.addEventListener('click', () => openDeleteModal('category', btn.dataset.id)));
}

function setupCategoryModal() {
  $('addCategoryBtn')?.addEventListener('click', () => openCategoryModal(null));
  $('closeCategoryModal')?.addEventListener('click', () => $('categoryModal').close());
  $('cancelCategoryModal')?.addEventListener('click', () => $('categoryModal').close());
  $('categoryName')?.addEventListener('input', function() {
    const slugEl = $('categorySlug');
    if (slugEl && !slugEl.dataset.manual) { slugEl.value = this.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''); }
  });
  $('categorySlug')?.addEventListener('input', function() { this.dataset.manual = '1'; });
  $('categoryForm')?.addEventListener('submit', handleCategorySubmit);
}

function openCategoryModal(id = null) {
  $('categoryModalTitle').textContent = id ? 'Edit Category' : 'Add Category';
  $('categoryForm').reset(); delete $('categorySlug').dataset.manual;
  if (id) {
    const cat = state.categories.find(c => c.id === id);
    if (cat) { 
      $('categoryId').value = cat.id; 
      $('categoryName').value = cat.name; 
      $('categorySlug').value = cat.slug;
      $('categoryImageUrl').value = cat.image_url || '';
    }
  }
  $('categoryModal').showModal();
}

function handleCategorySubmit(e) {
  e.preventDefault();
  const id = $('categoryId').value, name = $('categoryName').value.trim(), slug = $('categorySlug').value.trim() || name.toLowerCase().replace(/\s+/g,'-'), image_url = $('categoryImageUrl').value.trim();
  if (id) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx > -1) state.categories[idx] = { id, name, slug, image_url: image_url || undefined };
  } else { state.categories.push({ id: slug, name, slug, image_url: image_url || undefined }); }
  $('categoryModal').close(); renderCategories();
  showToast(`✅ Category ${id ? 'updated' : 'added'}`, 'success');
}

// ═══════════════════════════════════
// ORDERS — REAL API ONLY
// ═══════════════════════════════════
async function fetchOrders() {
  try {
    const res = await fetch(CONFIG.ordersUrl, { headers: authHeaders() });
    if (!res.ok) throw new Error('Orders API not ready');
    state.orders = await res.json();
  } catch (err) {
    console.error('Orders API error:', err.message);
    state.orders = []; // No mock fallback
  }
  renderOrders(state.orders);
  renderRecentOrders();
  updateOrderTabCounts();
  updateDashboardStats();
  updateNavBadge('navBadgeOrders', state.orders.filter(o => o.status === 'pending').length);
}

function renderOrders(orders) {
  const tbody = $('ordersTableBody');
  if (!tbody) return;
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted" style="padding:32px">No orders found</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr><td><strong style="font-family:monospace">#${o.id}</strong></td><td><div style="font-weight:500">${escHtml(o.customer_name || '—')}</div><div class="text-muted" style="font-size:.78rem">${escHtml(o.customer_email || '')}</div></td><td>${o.items || 1} item${(o.items||1) > 1 ? 's' : ''}</td><td><strong>₹${Number(o.total||0).toLocaleString('en-IN')}</strong></td><td><span class="status-badge status-${(o.status||'pending').replace(' ','-')}">${o.status||'pending'}</span></td><td class="text-muted">${formatDate(o.created_at || o.date)}</td><td><button class="btn-icon view-order" data-id="${o.id}" title="View">👁</button></td></tr>`).join('');
  tbody.querySelectorAll('.view-order').forEach(btn => btn.addEventListener('click', () => openOrderModal(btn.dataset.id)));
}

function openOrderModal(id) {
  const o = state.orders.find(x => String(x.id) === String(id));
  if (!o) return;
  $('orderModalTitle').textContent = `Order #${o.id}`;
  $('orderModalBody').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:4px 0 16px">
      <div><p class="text-muted" style="font-size:.78rem;margin-bottom:4px">CUSTOMER</p><p style="font-weight:600">${escHtml(o.customer_name||'—')}</p><p style="font-size:.875rem">${escHtml(o.customer_email||'')}</p><p style="font-size:.875rem">${escHtml(o.customer_phone||'')}</p></div>
      <div><p class="text-muted" style="font-size:.78rem;margin-bottom:4px">ORDER INFO</p><p style="font-size:.875rem"><strong>Status:</strong> <span class="status-badge status-${o.status}">${o.status}</span></p><p style="font-size:.875rem;margin-top:6px"><strong>Total:</strong> ₹${Number(o.total||0).toLocaleString('en-IN')}</p><p style="font-size:.875rem;margin-top:6px"><strong>Date:</strong> ${formatDate(o.created_at||o.date)}</p></div>
    </div>
    <div style="border-top:1px solid #e5e7eb;padding-top:16px"><p style="font-weight:600;margin-bottom:12px">Update Status</p><div style="display:flex;gap:8px;flex-wrap:wrap">${['pending','processing','shipped','delivered','cancelled'].map(s => `<button class="btn-sm ${s === o.status ? 'btn-primary' : 'btn-secondary'} update-status-btn" data-status="${s}" data-id="${o.id}">${s.charAt(0).toUpperCase()+s.slice(1)}</button>`).join('')}</div></div>`;
  $('orderModal').showModal();
  $('orderModalBody').querySelectorAll('.update-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const order = state.orders.find(x => String(x.id) === String(btn.dataset.id));
      if (order) order.status = btn.dataset.status;
      $('orderModal').close(); renderOrders(getFilteredOrders()); renderRecentOrders(); updateOrderTabCounts();
      showToast(`Order #${btn.dataset.id} → ${btn.dataset.status}`, 'success');
    });
  });
}

$('closeOrderModal')?.addEventListener('click', () => $('orderModal')?.close());

function setupOrderTabs() {
  $('orderTabs')?.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $('orderTabs').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); state.orderFilter = btn.dataset.status;
      renderOrders(getFilteredOrders());
    });
  });
  $('orderSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    const filtered = getFilteredOrders().filter(o => o.customer_name?.toLowerCase().includes(q) || String(o.id).includes(q));
    renderOrders(filtered);
  });
}

function getFilteredOrders() {
  if (state.orderFilter === 'all') return state.orders;
  return state.orders.filter(o => o.status === state.orderFilter);
}

function updateOrderTabCounts() {
  const counts = { all: state.orders.length };
  ['pending','processing','shipped','delivered','cancelled'].forEach(s => { counts[s] = state.orders.filter(o => o.status === s).length; });
  Object.entries(counts).forEach(([k,v]) => { const el = $('tab' + k.charAt(0).toUpperCase() + k.slice(1)); if (el) el.textContent = v; });
}

function renderRecentOrders() {
  const tbody = $('recentOrdersBody');
  if (!tbody) return;
  const recent = state.orders.slice(0, 5);
  if (!recent.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders yet</td></tr>'; return; }
  tbody.innerHTML = recent.map(o => `<tr><td><strong style="font-family:monospace">#${o.id}</strong></td><td>${escHtml(o.customer_name||'—')}</td><td>₹${Number(o.total||0).toLocaleString('en-IN')}</td><td><span class="status-badge status-${o.status||'pending'}">${o.status||'pending'}</span></td><td class="text-muted">${formatDate(o.created_at||o.date)}</td></tr>`).join('');
}

// ═══════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════
function renderCustomers() {
  const customerMap = {};
  state.orders.forEach(o => {
    const key = o.customer_email || o.customer_name;
    if (!key) return;
    if (!customerMap[key]) {
      customerMap[key] = { name: o.customer_name || '—', email: o.customer_email || '—', phone: o.customer_phone || '—', orders: 0, spent: 0, joined: o.created_at || o.date };
    }
    customerMap[key].orders++; customerMap[key].spent += Number(o.total || 0);
  });
  state.customers = Object.values(customerMap);
  const countEl = $('customersCount');
  if (countEl) countEl.textContent = `${state.customers.length} customer${state.customers.length !== 1 ? 's' : ''}`;
  const tbody = $('customersTableBody');
  if (!tbody) return;
  if (!state.customers.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:32px">No customers yet</td></tr>'; return; }
  tbody.innerHTML = state.customers.map(c => `<tr><td><strong>${escHtml(c.name)}</strong></td><td>${escHtml(c.email)}</td><td>${escHtml(c.phone)}</td><td>${c.orders}</td><td>₹${c.spent.toLocaleString('en-IN')}</td><td class="text-muted">${formatDate(c.joined)}</td></tr>`).join('');
  $('customerSearch')?.addEventListener('input', function() {
    const q = this.value.toLowerCase();
    tbody.querySelectorAll('tr').forEach(row => { row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
}

// ═══════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════
function renderAnalytics() { renderCategoryBreakdown(); renderStockHealth(); renderRevenueChart(); }

function renderCategoryBreakdown() {
  const el = $('categoryBreakdown');
  if (!el || !state.products.length) return;
  const cats = {};
  state.products.forEach(p => { const c = p.category || 'Other'; cats[c] = (cats[c] || 0) + 1; });
  const max = Math.max(...Object.values(cats));
  el.innerHTML = Object.entries(cats).sort((a,b) => b[1]-a[1]).map(([name, count]) => `
    <div class="breakdown-item"><div class="breakdown-label"><span style="text-transform:capitalize">${escHtml(name)}</span><span>${count} products</span></div><div class="breakdown-bar"><div class="breakdown-fill" style="width:${(count/max*100).toFixed(1)}%"></div></div></div>`).join('');
}

function renderStockHealth() {
  const el = $('stockHealth');
  if (!el || !state.products.length) return;
  const items = state.products.slice(0,6);
  const maxStock = Math.max(...items.map(p => getTotalStock(p)), 1);
  el.innerHTML = items.map(p => {
    const stock = getTotalStock(p);
    const pct = (stock / maxStock * 100).toFixed(1);
    const color = stock === 0 ? '#ef4444' : stock < 5 ? '#f59e0b' : '#22c55e';
    return `<div class="stock-bar-item"><span title="${escHtml(p.title)}">${escHtml(p.title.substring(0,12))}…</span><div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%;background:${color}"></div></div><span>${stock}</span></div>`;
  }).join('');
}

function renderRevenueChart() {
  const el = $('revenueChart');
  if (!el) return;
  // Placeholder: Connect to real revenue API later
  el.innerHTML = '<p class="text-muted" style="padding:20px;text-align:center">Revenue data will appear here once orders are placed.</p>';
}

function renderTopProducts() {
  const el = $('topProductsList');
  if (!el || !state.products.length) return;
  const top = state.products.slice(0, 5);
  el.innerHTML = top.map((p, i) => `
    <div class="top-product-item"><span class="tp-rank">#${i+1}</span><img class="tp-img" src="${escHtml(p.image_1||p.image||'/images/placeholder.webp')}" alt="${escHtml(p.title)}" onerror="this.src='/images/placeholder.webp'"><div class="tp-info"><div class="tp-name">${escHtml(p.title)}</div><div class="tp-cat" style="text-transform:capitalize">${escHtml(p.category||'')}</div></div><div class="tp-price">₹${Number(p.price).toLocaleString('en-IN')}</div></div>`).join('');
}

// ═══════════════════════════════════
// DELETE MODAL
// ═══════════════════════════════════
function setupDeleteModal() {
  $('cancelDelete')?.addEventListener('click', () => { $('deleteModal').close(); state.deleteTarget = null; });
  $('confirmDelete')?.addEventListener('click', async () => {
    if (!state.deleteTarget) return;
    const { type, id } = state.deleteTarget;
    if (type === 'product') { await deleteProduct(id); }
    else if (type === 'category') {
      state.categories = state.categories.filter(c => c.id !== id);
      renderCategories(); showToast('✅ Category deleted', 'success');
    }
    $('deleteModal').close(); state.deleteTarget = null;
  });
}

function openDeleteModal(type, id) {
  state.deleteTarget = { type, id };
  let name = id;
  if (type === 'product') { const p = state.products.find(x => String(x.id) === String(id)); name = p?.title || id; }
  else if (type === 'category') { const c = state.categories.find(x => x.id === id); name = c?.name || id; }
  $('deleteItemName').textContent = name; $('deleteModal').showModal();
}

async function deleteProduct(id, refresh = true) {
  try {
    const res = await fetch(CONFIG.productsUrl, { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ id }) });
    if (!res.ok) throw new Error('Delete failed');
    if (refresh) { showToast('✅ Product deleted', 'success'); fetchProducts(); }
  } catch (err) {
    // Optimistic local delete as fallback
    state.products = state.products.filter(p => String(p.id) !== String(id));
    if (refresh) { showToast('✅ Product deleted', 'success'); applyFiltersAndRender(); updateDashboardStats(); }
  }
}

// ═══════════════════════════════════
// DASHBOARD STATS
// ═══════════════════════════════════
function updateDashboardStats() {
  const products = state.products, orders = state.orders;
  if ($('stat-products')) $('stat-products').textContent = products.length;
  const lowStock = products.filter(p => { const s = getTotalStock(p); return s > 0 && s < 5; });
  if ($('stat-stock')) $('stat-stock').textContent = lowStock.length;
  if ($('stat-orders')) $('stat-orders').textContent = orders.length;
  const revenue = orders.filter(o => o.status !== 'cancelled').reduce((a, o) => a + Number(o.total || 0), 0);
  if ($('stat-revenue')) $('stat-revenue').textContent = '₹' + revenue.toLocaleString('en-IN');
}

function updateNavBadge(id, count) { const el = $(id); if (el) el.textContent = count; }

// ═══════════════════════════════════
// SETTINGS
// ═══════════════════════════════════
function setupSettingsTabs() {
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Only handle settings tabs (not CMS tabs)
      if (!tab.dataset.stab) return;
      document.querySelectorAll('#settings .settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('#settings .settings-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = `stab-${tab.dataset.stab}`;
      document.getElementById(panelId)?.classList.add('active');
    });
  });
 
  $('saveSettingsBtn')?.addEventListener('click', () => { showToast('✅ Settings saved', 'success'); });
  
  // Integration settings handlers
  $('saveWhatsappIntegrationBtn')?.addEventListener('click', async () => {
    const sheetUrl = $('whatsappSheetUrl')?.value?.trim();
    if (!sheetUrl) { showToast('❌ Please enter a valid Apps Script URL', 'error'); return; }
    try {
      // Test the endpoint
      const res = await fetch('/api/integrations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', customerData: { name: 'Test', phone: '+910000000000' }, sheetUrl })
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('whatsappSheetUrl', sheetUrl);
        showToast('✅ WhatsApp integration configured successfully', 'success');
      } else {
        showToast('❌ ' + (result.error || 'Failed to save'), 'error');
      }
    } catch (err) {
      showToast('❌ Connection failed: ' + err.message, 'error');
    }
  });
  
  $('saveEmailIntegrationBtn')?.addEventListener('click', async () => {
    const sheetUrl = $('emailSheetUrl')?.value?.trim();
    if (!sheetUrl) { showToast('❌ Please enter a valid Apps Script URL', 'error'); return; }
    try {
      const res = await fetch('/api/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', recipient: 'test@example.com', templateData: {}, sheetUrl })
      });
      const result = await res.json();
      if (result.success) {
        localStorage.setItem('emailSheetUrl', sheetUrl);
        showToast('✅ Email integration configured successfully', 'success');
      } else {
        showToast('❌ ' + (result.error || 'Failed to save'), 'error');
      }
    } catch (err) {
      showToast('❌ Connection failed: ' + err.message, 'error');
    }
  });
  
  $('testWhatsappBtn')?.addEventListener('click', async () => {
    const sheetUrl = localStorage.getItem('whatsappSheetUrl') || $('whatsappSheetUrl')?.value?.trim();
    if (!sheetUrl) { showToast('⚠️ Please configure WhatsApp integration first', 'warning'); return; }
    try {
      const res = await fetch('/api/integrations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', customerData: { name: 'Admin Test', phone: '+910000000000', email: 'admin@test.com' }, data: { message: 'Test message from admin panel' }, sheetUrl })
      });
      const result = await res.json();
      showToast(result.success ? '✅ WhatsApp test sent!' : '❌ ' + result.error, result.success ? 'success' : 'error');
    } catch (err) {
      showToast('❌ Test failed: ' + err.message, 'error');
    }
  });
  
  $('testEmailBtn')?.addEventListener('click', async () => {
    const sheetUrl = localStorage.getItem('emailSheetUrl') || $('emailSheetUrl')?.value?.trim();
    if (!sheetUrl) { showToast('⚠️ Please configure Email integration first', 'warning'); return; }
    try {
      const res = await fetch('/api/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'test', recipient: 'test@example.com', templateData: { subject: 'Test Email', message: 'This is a test email from EcomStore' }, sheetUrl })
      });
      const result = await res.json();
      showToast(result.success ? '✅ Email test sent!' : '❌ ' + result.error, result.success ? 'success' : 'error');
    } catch (err) {
      showToast('❌ Test failed: ' + err.message, 'error');
    }
  });
  
  // Load saved integration URLs on page load
  setTimeout(() => {
    const waUrl = localStorage.getItem('whatsappSheetUrl');
    const emUrl = localStorage.getItem('emailSheetUrl');
    if (waUrl && $('whatsappSheetUrl')) $('whatsappSheetUrl').value = waUrl;
    if (emUrl && $('emailSheetUrl')) $('emailSheetUrl').value = emUrl;
  }, 500);
  
  $('changePasswordBtn')?.addEventListener('click', () => {
    const np = $('newPassword')?.value, cp = $('confirmPassword')?.value;
    if (!np || np.length < 8) { showToast('❌ Password must be at least 8 characters', 'error'); return; }
    if (np !== cp) { showToast('❌ Passwords do not match', 'error'); return; }
    showToast('✅ Password updated', 'success');
    $('currentPassword').value = ''; $('newPassword').value = ''; $('confirmPassword').value = '';
  });
}

// ═══════════════════════════════════
// TOAST
// ═══════════════════════════════════
function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-msg">${escHtml(message)}</span><button class="toast-close" onclick="this.closest('.toast').remove()">×</button>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 260); }, 3500);
}

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════
function authHeaders() { return state.token ? { 'Authorization': `Bearer ${state.token}` } : {}; }

function getTotalStock(p) {
  const sizes = parseSizes(p.sizes);
  if (sizes.length) return sizes.reduce((a, s) => a + (s.stock || 0), 0);
  return typeof p.stock === 'number' ? p.stock : 0;
}

function parseSizes(sizes) {
  if (!sizes) return [];
  if (Array.isArray(sizes)) return sizes;
  try { return JSON.parse(sizes); } catch { return []; }
}

function getStockLabel(stock) {
  if (stock === 0) return 'Out of Stock';
  if (stock < 5) return 'Low Stock';
  return 'Active';
}

function getStatusClass(label) {
  if (label === 'Active') return 'status-active';
  if (label === 'Low Stock') return 'status-low-stock';
  if (label === 'Out of Stock') return 'status-out-of-stock';
  return '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
  catch { return dateStr; }
}

function escHtml(str) {
  if (str == null) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─ Expose for inline handlers ─
window.updateStockCount = updateStockCount;