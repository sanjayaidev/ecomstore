/**
 * Features Manager - Handles Collections, Abandoned Carts, Coupons, Webhooks, and CSV Import
 */

const FeaturesManager = {
  init() {
    this.bindEvents();
    this.loadCollections();
    this.loadAbandonedCarts();
    this.loadCoupons();
    this.loadWebhooks();
  },

  bindEvents() {
    // Collections
    document.getElementById('addCollectionBtn')?.addEventListener('click', () => this.openCollectionModal());
    document.getElementById('collectionForm')?.addEventListener('submit', (e) => this.handleCollectionSubmit(e));

    // Abandoned Carts
    document.getElementById('sendBulkRecoveryBtn')?.addEventListener('click', () => this.sendBulkRecovery());

    // Coupons
    document.getElementById('addCouponBtn')?.addEventListener('click', () => this.openCouponModal());
    document.getElementById('couponForm')?.addEventListener('submit', (e) => this.handleCouponSubmit(e));

    // Webhooks
    document.getElementById('addWebhookBtn')?.addEventListener('click', () => this.openWebhookModal());
    document.getElementById('webhookForm')?.addEventListener('submit', (e) => this.handleWebhookSubmit(e));

    // CSV Import
    document.getElementById('csvImportForm')?.addEventListener('submit', (e) => this.handleCSVImport(e));

    // Navigation
    document.querySelectorAll('[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        const section = e.currentTarget.dataset.section;
        if (section === 'collections') this.loadCollections();
        if (section === 'abandoned-carts') this.loadAbandonedCarts();
        if (section === 'coupons') this.loadCoupons();
        if (section === 'integrations') this.loadWebhooks();
      });
    });
  },

  // ══════════════ COLLECTIONS ══════════════
  async loadCollections() {
    const tbody = document.getElementById('collectionsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading…</td></tr>';

    try {
      const res = await fetch('/api/collections');
      const data = await res.json();
      const collections = data.collections || [];

      if (collections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No collections yet</td></tr>';
        return;
      }

      tbody.innerHTML = collections.map(c => `
        <tr>
          <td><strong>${this.escapeHtml(c.name)}</strong></td>
          <td><code>${this.escapeHtml(c.slug)}</code></td>
          <td>${c.product_count || 0}</td>
          <td><span class="status-badge ${c.is_visible ? 'active' : ''}">${c.is_visible ? '✓ Visible' : '✗ Hidden'}</span></td>
          <td>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.editCollection(${c.id})" title="Edit">✏️</button>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.deleteCollection(${c.id})" title="Delete">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load collections:', err);
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load</td></tr>';
    }
  },

  openCollectionModal(collectionId = null) {
    const modal = document.getElementById('collectionModal');
    const title = document.getElementById('collectionModalTitle');
    const form = document.getElementById('collectionForm');
    
    form.reset();
    form.querySelector('[name="edit_id"]').value = '';

    if (collectionId) {
      title.textContent = 'Edit Collection';
      // Fetch collection data and populate form
      this.fetchCollection(collectionId).then(c => {
        form.querySelector('[name="edit_id"]').value = c.id;
        form.querySelector('[name="name"]').value = c.name;
        form.querySelector('[name="slug"]').value = c.slug || '';
        form.querySelector('[name="description"]').value = c.description || '';
        form.querySelector('[name="image_url"]').value = c.image_url || '';
        form.querySelector('[name="is_visible"]').checked = c.is_visible !== false;
      });
    } else {
      title.textContent = 'Add Collection';
    }

    modal.classList.add('open');
  },

  async fetchCollection(id) {
    const res = await fetch(`/api/collections/${id}`);
    return res.json();
  },

  async handleCollectionSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = formData.get('edit_id');

    const data = {
      name: formData.get('name'),
      slug: formData.get('slug') || this.generateSlug(formData.get('name')),
      description: formData.get('description'),
      image_url: formData.get('image_url'),
      is_visible: formData.get('is_visible') === 'on'
    };

    try {
      const url = editId ? `/api/collections/${editId}` : '/api/collections';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast(editId ? 'Collection updated!' : 'Collection created!', 'success');
        Admin.closeModal('collectionModal');
        this.loadCollections();
      } else {
        Admin.showToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  async deleteCollection(id) {
    if (!confirm('Delete this collection? Products will not be deleted.')) return;
    
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast('Collection deleted', 'success');
        this.loadCollections();
      } else {
        Admin.showToast(result.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  // ══════════════ ABANDONED CARTS ══════════════
  async loadAbandonedCarts() {
    const tbody = document.getElementById('abandonedCartsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading…</td></tr>';

    try {
      const res = await fetch('/api/abandoned-carts');
      const data = await res.json();
      const carts = data.carts || [];

      // Update stats
      document.getElementById('stat-abandoned-count').textContent = carts.length;
      const totalRevenue = carts.reduce((sum, c) => sum + (parseFloat(c.total_amount) || 0), 0);
      document.getElementById('stat-recoverable-revenue').textContent = '₹' + totalRevenue.toFixed(2);
      const recovered = carts.filter(c => c.recovered).length;
      document.getElementById('stat-recovered-count').textContent = recovered;

      if (carts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No abandoned carts</td></tr>';
        return;
      }

      tbody.innerHTML = carts.map(c => `
        <tr>
          <td><code>${this.escapeHtml(c.cart_id)}</code></td>
          <td>${c.user_email ? this.escapeHtml(c.user_email) : '<span class="text-muted">Guest</span>'}</td>
          <td>${Array.isArray(c.items) ? c.items.length : 0} items</td>
          <td>₹${(parseFloat(c.total_amount) || 0).toFixed(2)}</td>
          <td>${new Date(c.created_at).toLocaleDateString()}</td>
          <td>
            <span class="status-badge ${c.recovered ? 'active' : ''}">
              ${c.recovered ? '✓ Recovered' : (c.recovery_email_sent ? '📧 Sent' : '⏳ Pending')}
            </span>
          </td>
          <td>
            ${!c.recovered ? `<button class="btn-primary btn-sm" onclick="FeaturesManager.sendRecovery('${this.escapeHtml(c.cart_id)}')">📧 Send Recovery</button>` : '<span class="text-muted">Recovered</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load abandoned carts:', err);
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load</td></tr>';
    }
  },

  async sendRecovery(cartId) {
    try {
      const res = await fetch('/api/abandoned-carts/send-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cart_id: cartId })
      });

      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast('Recovery email sent!', 'success');
        this.loadAbandonedCarts();
      } else {
        Admin.showToast(result.error || 'Failed to send', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  async sendBulkRecovery() {
    if (!confirm('Send recovery emails to all unrecovered carts?')) return;
    
    try {
      const res = await fetch('/api/abandoned-carts/bulk-recovery', { method: 'POST' });
      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast(`Sent ${result.sent || 0} recovery emails`, 'success');
        this.loadAbandonedCarts();
      } else {
        Admin.showToast(result.error || 'Failed to send', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  // ══════════════ COUPONS ══════════════
  async loadCoupons() {
    const tbody = document.getElementById('couponsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">Loading…</td></tr>';

    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      const coupons = data.coupons || [];

      if (coupons.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No coupons yet</td></tr>';
        return;
      }

      tbody.innerHTML = coupons.map(c => `
        <tr>
          <td><strong><code>${this.escapeHtml(c.code)}</code></strong></td>
          <td><span class="status-badge">${this.escapeHtml(c.type)}</span></td>
          <td>${c.type === 'percentage' ? c.value + '%' : '₹' + c.value}</td>
          <td>${c.min_purchase_amount > 0 ? '₹' + c.min_purchase_amount : '—'}</td>
          <td>${c.usage_count}/${c.usage_limit || '∞'}</td>
          <td>${c.valid_until ? new Date(c.valid_until).toLocaleDateString() : 'Never'}</td>
          <td><span class="status-badge ${c.is_active ? 'active' : ''}">${c.is_active ? '✓ Active' : '✗ Inactive'}</span></td>
          <td>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.editCoupon(${c.id})" title="Edit">✏️</button>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.deleteCoupon(${c.id})" title="Delete">🗑️</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load coupons:', err);
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load</td></tr>';
    }
  },

  openCouponModal(couponId = null) {
    const modal = document.getElementById('couponModal');
    const title = document.getElementById('couponModalTitle');
    const form = document.getElementById('couponForm');
    
    form.reset();
    form.querySelector('[name="edit_id"]').value = '';

    if (couponId) {
      title.textContent = 'Edit Coupon';
      this.fetchCoupon(couponId).then(c => {
        form.querySelector('[name="edit_id"]').value = c.id;
        form.querySelector('[name="code"]').value = c.code;
        form.querySelector('[name="type"]').value = c.type;
        form.querySelector('[name="value"]').value = c.value;
        form.querySelector('[name="description"]').value = c.description || '';
        form.querySelector('[name="min_purchase_amount"]').value = c.min_purchase_amount || 0;
        form.querySelector('[name="max_discount_amount"]').value = c.max_discount_amount || '';
        form.querySelector('[name="usage_limit"]').value = c.usage_limit || '';
        form.querySelector('[name="per_customer_limit"]').value = c.per_customer_limit || 1;
        form.querySelector('[name="valid_from"]').value = c.valid_from ? new Date(c.valid_from).toISOString().slice(0, 16) : '';
        form.querySelector('[name="valid_until"]').value = c.valid_until ? new Date(c.valid_until).toISOString().slice(0, 16) : '';
        form.querySelector('[name="is_active"]').checked = c.is_active !== false;
      });
    } else {
      title.textContent = 'Add Coupon';
    }

    modal.classList.add('open');
  },

  async fetchCoupon(id) {
    const res = await fetch(`/api/coupons/${id}`);
    return res.json();
  },

  async handleCouponSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = formData.get('edit_id');

    const data = {
      code: formData.get('code').toUpperCase(),
      type: formData.get('type'),
      value: parseFloat(formData.get('value')),
      description: formData.get('description'),
      min_purchase_amount: parseFloat(formData.get('min_purchase_amount')) || 0,
      max_discount_amount: parseFloat(formData.get('max_discount_amount')) || null,
      usage_limit: parseInt(formData.get('usage_limit')) || null,
      per_customer_limit: parseInt(formData.get('per_customer_limit')) || 1,
      valid_from: formData.get('valid_from') || null,
      valid_until: formData.get('valid_until') || null,
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = editId ? `/api/coupons/${editId}` : '/api/coupons';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast(editId ? 'Coupon updated!' : 'Coupon created!', 'success');
        Admin.closeModal('couponModal');
        this.loadCoupons();
      } else {
        Admin.showToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  async deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast('Coupon deleted', 'success');
        this.loadCoupons();
      } else {
        Admin.showToast(result.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  // ══════════════ WEBHOOKS ══════════════
  async loadWebhooks() {
    const tbody = document.getElementById('webhooksTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading…</td></tr>';

    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      const webhooks = data.webhooks || [];

      if (webhooks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No webhooks configured</td></tr>';
        return;
      }

      tbody.innerHTML = webhooks.map(w => `
        <tr>
          <td><strong>${this.escapeHtml(w.name)}</strong></td>
          <td><code style="font-size:0.75rem">${this.truncate(w.url, 40)}</code></td>
          <td>${Array.isArray(w.events) ? w.events.map(e => `<span class="status-badge" style="font-size:0.65rem">${e}</span>`).join(' ') : '—'}</td>
          <td><span class="status-badge ${w.is_active ? 'active' : ''}">${w.is_active ? '✓ Active' : '✗ Inactive'}</span></td>
          <td>${w.last_triggered_at ? new Date(w.last_triggered_at).toLocaleString() : 'Never'}</td>
          <td>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.editWebhook(${w.id})" title="Edit">✏️</button>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.deleteWebhook(${w.id})" title="Delete">🗑️</button>
            <button class="btn-icon btn-sm" onclick="FeaturesManager.testWebhook(${w.id})" title="Test">🧪</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Failed to load webhooks:', err);
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load</td></tr>';
    }
  },

  openWebhookModal(webhookId = null) {
    const modal = document.getElementById('webhookModal');
    const title = document.getElementById('webhookModalTitle');
    const form = document.getElementById('webhookForm');
    
    form.reset();
    form.querySelector('[name="edit_id"]').value = '';

    if (webhookId) {
      title.textContent = 'Edit Webhook';
      this.fetchWebhook(webhookId).then(w => {
        form.querySelector('[name="edit_id"]').value = w.id;
        form.querySelector('[name="name"]').value = w.name;
        form.querySelector('[name="url"]').value = w.url;
        form.querySelector('[name="events"]').value = Array.isArray(w.events) ? w.events.join(',') : '';
        form.querySelector('[name="secret_key"]').value = w.secret_key || '';
        form.querySelector('[name="is_active"]').checked = w.is_active !== false;
      });
    } else {
      title.textContent = 'Add Webhook';
    }

    modal.classList.add('open');
  },

  async fetchWebhook(id) {
    const res = await fetch(`/api/webhooks/${id}`);
    return res.json();
  },

  async handleWebhookSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const editId = formData.get('edit_id');

    const eventsStr = formData.get('events');
    const events = eventsStr ? eventsStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    const data = {
      name: formData.get('name'),
      url: formData.get('url'),
      events: events,
      secret_key: formData.get('secret_key'),
      is_active: formData.get('is_active') === 'on'
    };

    try {
      const url = editId ? `/api/webhooks/${editId}` : '/api/webhooks';
      const method = editId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast(editId ? 'Webhook updated!' : 'Webhook created!', 'success');
        Admin.closeModal('webhookModal');
        this.loadWebhooks();
      } else {
        Admin.showToast(result.error || 'Failed to save', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  async testWebhook(id) {
    try {
      const res = await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast('Test webhook sent! Check the endpoint.', 'success');
      } else {
        Admin.showToast(result.error || 'Failed to test', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  async deleteWebhook(id) {
    if (!confirm('Delete this webhook?')) return;
    
    try {
      const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      const result = await res.json();
      
      if (res.ok) {
        Admin.showToast('Webhook deleted', 'success');
        this.loadWebhooks();
      } else {
        Admin.showToast(result.error || 'Failed to delete', 'error');
      }
    } catch (err) {
      Admin.showToast('Network error', 'error');
    }
  },

  // ══════════════ CSV IMPORT ══════════════
  async handleCSVImport(e) {
    e.preventDefault();
    const form = e.target;
    const fileInput = form.querySelector('[name="csv_file"]');
    const resultDiv = document.getElementById('csvImportResult');

    if (!fileInput.files[0]) {
      Admin.showToast('Please select a CSV file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('csv_file', fileInput.files[0]);

    resultDiv.innerHTML = '<p class="text-muted">⏳ Uploading and processing...</p>';

    try {
      const res = await fetch('/api/csv-import', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      
      if (res.ok) {
        resultDiv.innerHTML = `
          <div class="status-badge active" style="padding:8px 16px">
            ✓ Successfully imported ${result.imported || 0} products. 
            ${result.errors && result.errors.length > 0 ? `${result.errors.length} errors.` : ''}
          </div>
          ${result.errors && result.errors.length > 0 ? `
            <details style="margin-top:12px;font-size:0.85rem">
              <summary style="cursor:pointer;color:#dc2626">View Errors</summary>
              <ul style="margin-top:8px;padding-left:20px">
                ${result.errors.map(err => `<li>${this.escapeHtml(err)}</li>`).join('')}
              </ul>
            </details>
          ` : ''}
        `;
        Admin.showToast(`Imported ${result.imported || 0} products`, 'success');
        form.reset();
      } else {
        resultDiv.innerHTML = `<p class="text-danger">✗ ${result.error || 'Import failed'}</p>`;
        Admin.showToast(result.error || 'Import failed', 'error');
      }
    } catch (err) {
      resultDiv.innerHTML = `<p class="text-danger">✗ Network error</p>`;
      Admin.showToast('Network error', 'error');
    }
  },

  // ══════════════ UTILITIES ══════════════
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  truncate(str, len) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  generateSlug(text) {
    return text.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
};

// Initialize when DOM is ready
if (typeof Admin !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => FeaturesManager.init());
}
