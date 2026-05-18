// admin/admin.js
const API = {
  auth: '/api/login',
  products: '/api/admin/products',
  tokenKey: 'admin_token'
};

// --- AUTH & INIT ---
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem(API.tokenKey);
  if (!token) {
    showLoginModal();
    return;
  }
  initAdmin(token);
});

function showLoginModal() {
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-overlay';
    modal.innerHTML = `
      <div class="auth-box">
        <h2>🔐 Admin Login</h2>
        <form id="login-form">
          <input type="email" id="login-email" placeholder="Email" required>
          <input type="password" id="login-password" placeholder="Password" required>
          <button type="submit">Login</button>
          <p id="login-error" style="color:red; margin-top:10px; font-size:0.9rem;"></p>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // Minimal modal CSS
    const style = document.createElement('style');
    style.textContent = `
      .auth-overlay { position:fixed; inset:0; background:rgba(15,23,42,0.9); display:flex; align-items:center; justify-content:center; z-index:9999; backdrop-filter:blur(4px); }
      .auth-box { background:#fff; padding:2rem; border-radius:12px; width:90%; max-width:380px; box-shadow:0 20px 40px rgba(0,0,0,0.2); }
      .auth-box input, .auth-box button { width:100%; padding:12px; margin:6px 0; border:1px solid #ddd; border-radius:6px; font-size:14px; }
      .auth-box button { background:#2563eb; color:white; border:none; cursor:pointer; font-weight:600; }
      .auth-box button:hover { background:#1d4ed8; }
    `;
    document.head.appendChild(style);

    document.getElementById('login-form').addEventListener('submit', handleLogin);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = 'Authenticating...';

  try {
    const res = await fetch(API.auth, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Invalid credentials');

    localStorage.setItem(API.tokenKey, data.token);
    document.getElementById('auth-modal').remove();
    initAdmin(data.token);
  } catch (err) {
    errorEl.textContent = err.message;
  }
}

async function initAdmin(token) {
  try {
    // Verify token works
    await authFetch(API.products);
    setupNavigation();
    loadProducts();
    setupSizeInputs();
    setupAddProductForm();
  } catch (err) {
    console.error('Auth failed:', err);
    localStorage.removeItem(API.tokenKey);
    showLoginModal();
  }
}

window.logout = () => {
  localStorage.removeItem(API.tokenKey);
  location.reload();
};

// --- API HELPER ---
async function authFetch(url, options = {}) {
  const token = localStorage.getItem(API.tokenKey);
  if (!token) throw new Error('Session expired. Please login again.');

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  if (res.status === 401) {
    window.logout();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- NAVIGATION ---
function setupNavigation() {
  const menuItems = document.querySelectorAll('.menu-item');
  const sections = document.querySelectorAll('.admin-section');

  menuItems.forEach(btn => {
    btn.addEventListener('click', () => {
      menuItems.forEach(i => i.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const target = btn.dataset.section;
      document.getElementById(target)?.classList.add('active');

      if (target === 'products') loadProducts();
      if (target === 'orders') loadOrders(); // Stub for now
    });
  });
}

// --- PRODUCTS ---
async function loadProducts() {
  const tbody = document.querySelector('#products-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;">Loading products...</td></tr>';

  try {
    const products = await authFetch(API.products);
    tbody.innerHTML = products.length === 0
      ? '<tr><td colspan="6" style="padding:20px;text-align:center;">No products found</td></tr>'
      : products.map(p => `
        <tr>
          <td><img src="${p.image_1}" width="48" height="48" style="object-fit:cover; border-radius:6px;" onerror="this.src='/images/placeholder.webp'"></td>
          <td><strong>${p.title}</strong></td>
          <td><span class="badge">${p.category}</span></td>
          <td>₹${p.price} ${p.discount_price ? `<br><span style="color:#16a34a; font-size:0.85em;">₹${p.discount_price}</span>` : ''}</td>
          <td>${p.sizes ? (typeof p.sizes === 'string' ? p.sizes : p.sizes.join(', ')) : 'N/A'}</td>
          <td>
            <button onclick="editProduct('${p.id}')" class="btn-sm btn-edit">Edit</button>
            <button onclick="deleteProduct('${p.id}')" class="btn-sm btn-delete">Delete</button>
          </td>
        </tr>
      `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#dc2626; padding:20px;">${err.message}</td></tr>`;
  }
}

// --- DYNAMIC SIZES ---
function setupSizeInputs() {
  const container = document.getElementById('sizes-container');
  const addBtn = document.getElementById('add-size-btn');
  if (!container || !addBtn) return;

  window.addSizeRow = (name = '', stock = 10) => {
    const row = document.createElement('div');
    row.className = 'size-row';
    row.style.cssText = 'display:flex; gap:8px; margin:6px 0; align-items:center;';
    row.innerHTML = `
      <input type="text" name="size_name" placeholder="Size (e.g., M, L)" value="${name}" required style="flex:1; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
      <input type="number" name="size_stock" placeholder="Stock" value="${stock}" min="0" required style="width:80px; padding:8px; border:1px solid #cbd5e1; border-radius:4px;">
      <button type="button" onclick="this.parentElement.remove()" style="width:32px; height:32px; background:#fee2e2; color:#dc2626; border:none; border-radius:4px; cursor:pointer; font-weight:bold;">×</button>
    `;
    container.appendChild(row);
  };

  addBtn.addEventListener('click', () => window.addSizeRow());
  if (container.children.length === 0) window.addSizeRow();
}

// --- ADD PRODUCT FORM ---
function setupAddProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = 'Adding...';
    btn.disabled = true;

    try {
      const data = {
        title: form.title.value.trim(),
        category: form.category.value,
        price: parseFloat(form.price.value),
        discount_price: form.discount_price.value ? parseFloat(form.discount_price.value) : null,
        description: form.description.value.trim(),
        long_description: form.long_description.value.trim() || null,
        care_instructions: form.care_instructions.value.trim() || null,
        keywords: form.keywords.value.split(',').map(k => k.trim()).filter(Boolean),
        image_1: form.image_1.value.trim(),
        image_2: form.image_2.value.trim() || null,
        image_3: form.image_3.value.trim() || null,
        image_4: form.image_4.value.trim() || null,
        image_5: form.image_5.value.trim() || null,
        sizes: []
      };

      // Collect sizes
      document.querySelectorAll('#sizes-container .size-row').forEach(row => {
        const name = row.querySelector('[name="size_name"]').value.trim();
        const stock = parseInt(row.querySelector('[name="size_stock"]').value) || 0;
        if (name) data.sizes.push({ name, stock });
      });

      await authFetch(API.products, {
        method: 'POST',
        body: JSON.stringify(data)
      });

      alert('✅ Product added successfully!');
      form.reset();
      document.getElementById('sizes-container').innerHTML = '';
      setupSizeInputs();
      loadProducts();
      // Auto-switch to products tab
      document.querySelector('[data-section="products"]').click();

    } catch (err) {
      alert('❌ Error: ' + err.message);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
}

// --- EDIT / DELETE ---
window.editProduct = (id) => {
  alert('🔧 Edit modal coming next. For now, use Delete & Re-add.');
};

window.deleteProduct = async (id) => {
  if (!confirm('Are you sure you want to permanently delete this product?')) return;
  try {
    await authFetch(API.products, {
      method: 'DELETE',
      body: JSON.stringify({ id })
    });
    alert('✅ Product deleted');
    loadProducts();
  } catch (err) {
    alert('❌ Delete failed: ' + err.message);
  }
};

// --- ORDERS STUB ---
async function loadOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:20px;text-align:center;">Orders system coming next step...</td></tr>';
}