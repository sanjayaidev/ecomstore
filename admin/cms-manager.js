// ═══════════════════════════════════════════
// admin/cms-manager.js — Homepage CMS Manager
// Runs AFTER admin.js; no conflicts with product/category admin logic
// ═══════════════════════════════════════════

'use strict';

const CMS = (() => {
  const API_BASE = '/api/cms';

  // ── State ──
  let currentTab = 'sliders';
  let data = {
    sliders: [],
    categories: [],
    banners: [],
    sections: [],
    trustFeatures: [],
    newsletter: null
  };

  // ── Bootstrap ──
  // Called by admin.js navigateTo() when user clicks "cms" nav item.
  // Also exposed as window.loadCMSData for compatibility.
  function loadCMSData() {
    fetchAll();
  }
  window.loadCMSData = loadCMSData;

  // ── Tab wiring (runs on DOMContentLoaded) ──
  function initTabs() {
    const tabBar = document.getElementById('cmsTabs');
    if (!tabBar) return;
    
    // Set default active tab (sliders) and render initial data
    const defaultTab = 'sliders';
    const defaultBtn = tabBar.querySelector(`.settings-tab[data-cmstab="${defaultTab}"]`);
    if (defaultBtn && !defaultBtn.classList.contains('active')) {
      defaultBtn.classList.add('active');
    }
    const defaultPanel = document.getElementById(`cmstab-${defaultTab}`);
    if (defaultPanel && !defaultPanel.classList.contains('active')) {
      defaultPanel.classList.add('active');
    }
    currentTab = defaultTab;
    
    tabBar.querySelectorAll('.settings-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        tabBar.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.cmstab;
        document.querySelectorAll('#cms .settings-panel').forEach(p => p.classList.remove('active'));
        const panel = document.getElementById(`cmstab-${currentTab}`);
        if (panel) panel.classList.add('active');
        renderTab(currentTab);
      });
    });
  }

  // ── "Add" button wiring ──
  function initAddButtons() {
    const map = {
      addSliderBtn:      () => openModal('cmsSliderModal', {}),
      addCmsCategoryBtn: () => openModal('cmsCategoryModal', {}),
      addBannerBtn:      () => openModal('cmsBannerModal', {}),
      addSectionBtn:     () => openModal('cmsSectionModal', {}),
      addTrustBtn:       () => openModal('cmsTrustModal', {})
    };
    Object.entries(map).forEach(([id, fn]) => {
      document.getElementById(id)?.addEventListener('click', fn);
    });
  }

  // ── Form submit wiring ──
  function initForms() {
    const formMap = [
      { formId: 'cmsSliderForm',   endpoint: `${API_BASE}/sliders`,        modalId: 'cmsSliderModal'   },
      { formId: 'cmsCategoryForm', endpoint: `${API_BASE}/categories`,     modalId: 'cmsCategoryModal' },
      { formId: 'cmsBannerForm',   endpoint: `${API_BASE}/banners`,        modalId: 'cmsBannerModal'   },
      { formId: 'cmsSectionForm',  endpoint: `${API_BASE}/sections`,       modalId: 'cmsSectionModal'  },
      { formId: 'cmsTrustForm',    endpoint: `${API_BASE}/trust-features`, modalId: 'cmsTrustModal'    }
    ];

    formMap.forEach(({ formId, endpoint, modalId }) => {
      const form = document.getElementById(formId);
      if (!form) return;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const raw = Object.fromEntries(new FormData(form).entries());
        const payload = normalizePayload(raw);
        const editId = payload.edit_id;
        delete payload.edit_id;

        const method = editId ? 'PUT' : 'POST';
        const url    = editId ? `${endpoint}/${editId}` : endpoint;

        try {
          const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const result = await res.json();
          if (result.success) {
            showToast('✅ Saved successfully', 'success');
            closeModal(modalId);
            fetchAll();
          } else {
            showToast('❌ ' + (result.error || 'Save failed'), 'error');
          }
        } catch {
          showToast('❌ Network error', 'error');
        }
      });
    });

    // Newsletter
    document.getElementById('saveNewsletterBtn')?.addEventListener('click', async () => {
      const payload = {
        title:     document.getElementById('nl_title')?.value || '',
        subtitle:  document.getElementById('nl_subtitle')?.value || '',
        is_active: document.getElementById('nl_is_active')?.checked ?? true
      };
      try {
        const res    = await fetch(`${API_BASE}/newsletter`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await res.json();
        result.success ? showToast('✅ Newsletter saved', 'success') : showToast('❌ ' + (result.error || 'Failed'), 'error');
      } catch {
        showToast('❌ Network error', 'error');
      }
    });
  }

  // ── Fetch all CMS data from API ──
  async function fetchAll() {
    try {
      const res    = await fetch(`${API_BASE}/content`);
      const result = await res.json();
      if (result.success) {
        data.sliders       = result.data.sliders       || [];
        data.categories    = result.data.categories    || [];
        data.banners       = result.data.banners       || [];
        data.sections      = result.data.sections      || [];
        data.trustFeatures = result.data.trustFeatures || [];
        data.newsletter    = result.data.newsletter    || null;
        renderTab(currentTab);
        renderNewsletter(); // always pre-populate newsletter form
      } else {
        showToast('❌ Failed to load CMS data', 'error');
      }
    } catch (err) {
      console.error('CMS fetch error:', err);
      showToast('❌ Could not connect to CMS API', 'error');
    }
  }

  // ── Render dispatcher ──
  function renderTab(tab) {
    switch (tab) {
      case 'sliders':    renderSliders();       break;
      case 'categories': renderCmsCategories(); break;
      case 'banners':    renderBanners();       break;
      case 'sections':   renderSections();      break;
      case 'trust':      renderTrust();         break;
      case 'newsletter': renderNewsletter();    break;
    }
  }

  // ── Renderers ──
  function renderSliders() {
    const el = document.getElementById('slidersList');
    if (!el) return;
    if (!data.sliders.length) { el.innerHTML = emptyState('No sliders yet. Click "+ Add Slider" to create one.'); return; }
    el.innerHTML = data.sliders.map(s => `
      <div class="data-row">
        <div class="data-row__preview" style="background:${esc(s.background_color || '#f3f4f6')}">
          ${s.image_url ? `<img src="${esc(s.image_url)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}<span style="display:${s.image_url ? 'none' : 'flex'};font-size:2rem">${esc(s.icon_emoji || '🎠')}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${esc(s.title)}</div>
          <div class="data-row__meta">
            <span>${esc(s.subtitle || 'No subtitle')}</span>
            <span class="status-badge ${s.is_active ? 'active' : ''}">${s.is_active ? 'Active' : 'Inactive'}</span>
            <span>Order: ${s.display_order}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="CMS.editSlider(${s.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="CMS.deleteSlider(${s.id})" title="Delete">🗑️</button>
        </div>
      </div>`).join('');
  }

  function renderCmsCategories() {
    const el = document.getElementById('cmsCategoriesList');
    if (!el) return;
    if (!data.categories.length) { el.innerHTML = emptyState('No categories yet.'); return; }
    el.innerHTML = data.categories.map(c => `
      <div class="data-row">
        <div class="data-row__preview"><span style="font-size:2rem">${esc(c.icon_emoji || '📂')}</span></div>
        <div class="data-row__info">
          <div class="data-row__title">${esc(c.name)}</div>
          <div class="data-row__meta">
            <span>/${esc(c.slug)}</span>
            <span class="status-badge ${c.is_active ? 'active' : ''}">${c.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="CMS.editCategory(${c.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="CMS.deleteCategory(${c.id})" title="Delete">🗑️</button>
        </div>
      </div>`).join('');
  }

  function renderBanners() {
    const el = document.getElementById('bannersList');
    if (!el) return;
    if (!data.banners.length) { el.innerHTML = emptyState('No offer banners yet.'); return; }
    el.innerHTML = data.banners.map(b => `
      <div class="data-row">
        <div class="data-row__preview" style="background:linear-gradient(135deg,${esc(b.gradient_start||'#667eea')},${esc(b.gradient_end||'#764ba2')})">
          <span style="color:white;font-weight:bold;font-size:.75rem">${esc(b.offer_text || 'OFFER')}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${esc(b.title)}</div>
          <div class="data-row__meta">
            <span>${esc(b.subtitle || '')}</span>
            <span class="status-badge ${b.is_active ? 'active' : ''}">${b.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="CMS.editBanner(${b.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="CMS.deleteBanner(${b.id})" title="Delete">🗑️</button>
        </div>
      </div>`).join('');
  }

  function renderSections() {
    const el = document.getElementById('sectionsList');
    if (!el) return;
    if (!data.sections.length) { el.innerHTML = emptyState('No product sections yet.'); return; }
    el.innerHTML = data.sections.map(s => `
      <div class="data-row">
        <div class="data-row__preview"><span style="font-size:2rem">📦</span></div>
        <div class="data-row__info">
          <div class="data-row__title">${esc(s.title)}</div>
          <div class="data-row__meta">
            <span>${esc(s.section_type || 'custom')}</span>
            <span class="status-badge ${s.is_active ? 'active' : ''}">${s.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="CMS.editSection(${s.id})" title="Edit">✏️</button>
        </div>
      </div>`).join('');
  }

  function renderTrust() {
    const el = document.getElementById('trustList');
    if (!el) return;
    if (!data.trustFeatures.length) { el.innerHTML = emptyState('No trust features yet.'); return; }
    el.innerHTML = data.trustFeatures.map(f => `
      <div class="data-row">
        <div class="data-row__preview"><span style="font-size:2rem">${esc(f.icon_emoji || '✓')}</span></div>
        <div class="data-row__info">
          <div class="data-row__title">${esc(f.title)}</div>
          <div class="data-row__meta">
            <span>${esc(f.description || '')}</span>
            <span class="status-badge ${f.is_active ? 'active' : ''}">${f.is_active ? 'Active' : 'Inactive'}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="CMS.editTrust(${f.id})" title="Edit">✏️</button>
        </div>
      </div>`).join('');
  }

  function renderNewsletter() {
    const loading = document.getElementById('newsletterLoading');
    const wrap    = document.getElementById('newsletterFormWrap');
    if (!wrap) return;
    if (loading) loading.style.display = 'none';
    wrap.style.display = 'block';
    if (data.newsletter) {
      const nl = data.newsletter;
      const title = document.getElementById('nl_title');
      const sub   = document.getElementById('nl_subtitle');
      const chk   = document.getElementById('nl_is_active');
      if (title) title.value = nl.title || '';
      if (sub)   sub.value   = nl.subtitle || '';
      if (chk)   chk.checked = nl.is_active !== false;
    }
  }

  // ── Modal open/close ──
  function openModal(modalId, fieldData) {
    const overlay = document.getElementById(modalId);
    if (!overlay) return;
    // Reset all inputs
    overlay.querySelectorAll('input:not([type=submit]), textarea, select').forEach(el => {
      if (el.type === 'checkbox') el.checked = el.defaultChecked;
      else if (el.type === 'color') el.value = el.defaultValue || '#ffffff';
      else el.value = el.defaultValue || '';
    });
    // Populate with data
    Object.entries(fieldData).forEach(([key, val]) => {
      const field = overlay.querySelector(`[name="${key}"]`);
      if (!field) return;
      if (field.type === 'checkbox') field.checked = !!val;
      else field.value = val ?? '';
    });
    overlay.classList.add('open');
  }

  function closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('open');
  }
  // Expose for inline onclick
  CMS.closeModal = closeModal;

  // Close on backdrop click
  document.addEventListener('click', e => {
    if (e.target.classList.contains('cms-modal-overlay')) {
      e.target.classList.remove('open');
    }
  });

  // ── Edit helpers ──
  CMS.editSlider = function(id) {
    const s = data.sliders.find(x => x.id === id);
    if (!s) return;
    document.getElementById('cmsSliderModalTitle').textContent = 'Edit Slider';
    openModal('cmsSliderModal', {
      edit_id: s.id, title: s.title, subtitle: s.subtitle || '',
      image_url: s.image_url || '', cta_text: s.cta_text || '', cta_link: s.cta_link || '',
      background_color: s.background_color || '#f0f9ff', text_color: s.text_color || '#1e3a8a',
      display_order: s.display_order, is_active: s.is_active !== false
    });
  };

  CMS.editCategory = function(id) {
    const c = data.categories.find(x => x.id === id);
    if (!c) return;
    document.getElementById('cmsCategoryModalTitle').textContent = 'Edit Category';
    openModal('cmsCategoryModal', {
      edit_id: c.id, name: c.name, slug: c.slug, icon_emoji: c.icon_emoji || '📂',
      image_url: c.image_url || '', description: c.description || '',
      display_order: c.display_order, is_active: c.is_active !== false
    });
  };

  CMS.editBanner = function(id) {
    const b = data.banners.find(x => x.id === id);
    if (!b) return;
    document.getElementById('cmsBannerModalTitle').textContent = 'Edit Banner';
    openModal('cmsBannerModal', {
      edit_id: b.id, title: b.title, subtitle: b.subtitle || '',
      offer_text: b.offer_text || '', gradient_start: b.gradient_start || '#667eea',
      gradient_end: b.gradient_end || '#764ba2', cta_text: b.cta_text || '',
      cta_link: b.cta_link || '', display_order: b.display_order, is_active: b.is_active !== false
    });
  };

  CMS.editSection = function(id) {
    const s = data.sections.find(x => x.id === id);
    if (!s) return;
    document.getElementById('cmsSectionModalTitle').textContent = 'Edit Section';
    openModal('cmsSectionModal', {
      edit_id: s.id, title: s.title, subtitle: s.subtitle || '',
      section_type: s.section_type || 'featured', display_order: s.display_order,
      is_active: s.is_active !== false
    });
  };

  CMS.editTrust = function(id) {
    const f = data.trustFeatures.find(x => x.id === id);
    if (!f) return;
    document.getElementById('cmsTrustModalTitle').textContent = 'Edit Trust Feature';
    openModal('cmsTrustModal', {
      edit_id: f.id, icon_emoji: f.icon_emoji || '✓', title: f.title,
      description: f.description || '', display_order: f.display_order,
      is_active: f.is_active !== false
    });
  };

  // ── Delete helpers ──
  CMS.deleteSlider = async function(id) {
    if (!confirm('Delete this slider?')) return;
    await doDelete(`${API_BASE}/sliders/${id}`, 'Slider deleted');
  };
  CMS.deleteCategory = async function(id) {
    if (!confirm('Delete this category?')) return;
    await doDelete(`${API_BASE}/categories/${id}`, 'Category deleted');
  };
  CMS.deleteBanner = async function(id) {
    if (!confirm('Delete this banner?')) return;
    await doDelete(`${API_BASE}/banners/${id}`, 'Banner deleted');
  };

  async function doDelete(url, msg) {
    try {
      const res    = await fetch(url, { method: 'DELETE' });
      const result = await res.json();
      result.success ? (showToast('✅ ' + msg, 'success'), fetchAll()) : showToast('❌ ' + (result.error || 'Delete failed'), 'error');
    } catch {
      showToast('❌ Network error', 'error');
    }
  }

  // ── Utilities ──
  function normalizePayload(raw) {
    const out = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (v === '') { out[k] = null; return; }
      if (k === 'display_order') { out[k] = parseInt(v) || 0; return; }
      // checkboxes come through as 'on' from FormData only when checked;
      // unchecked checkboxes are simply absent — handle below
      out[k] = v;
    });
    // Ensure boolean fields that may be absent (unchecked checkbox = false)
    ['is_active'].forEach(boolKey => {
      if (!(boolKey in out)) out[boolKey] = false;
      else if (out[boolKey] === 'on') out[boolKey] = true;
    });
    return out;
  }

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function emptyState(msg) {
    return `<p class="text-muted text-center" style="padding:2rem">${esc(msg)}</p>`;
  }

  function showToast(message, type = 'success') {
    // Prefer admin.js showToast if available, otherwise fall back
    if (typeof window.adminShowToast === 'function') {
      window.adminShowToast(message, type);
      return;
    }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span><span class="toast-msg">${esc(message)}</span><button class="toast-close" onclick="this.closest('.toast').remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('hiding'); setTimeout(() => toast.remove(), 260); }, 3500);
  }

  // ── Init on DOM ready ──
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initAddButtons();
    initForms();
  });

  // ── Public API ──
  return {
    loadCMSData,
    closeModal,
    editSlider:   CMS.editSlider,
    editCategory: CMS.editCategory,
    editBanner:   CMS.editBanner,
    editSection:  CMS.editSection,
    editTrust:    CMS.editTrust,
    deleteSlider:   CMS.deleteSlider,
    deleteCategory: CMS.deleteCategory,
    deleteBanner:   CMS.deleteBanner
  };
})();