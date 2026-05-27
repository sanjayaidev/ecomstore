// CMS Manager - Homepage Content Management System
(function() {
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

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    loadCMSData();
  });

  // ── Tab wiring (runs on DOMContentLoaded) ──
  function initTabs() {
    const tabBar = document.getElementById('cmsTabs');
    if (!tabBar) return;
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
        cmsData = result.data;
        renderCurrentTab();
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
          ${s.image_url ? `<img src="${esc(s.image_url)}" alt="">` : `<span>${esc(s.icon_emoji || '🎠')}</span>`}
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
    const form = document.getElementById('newsletterForm');
    if (!form) return;
    
    if (cmsData.newsletter) {
      form.querySelector('[name="nl_title"]').value = cmsData.newsletter.title || '';
      form.querySelector('[name="nl_subtitle"]').value = cmsData.newsletter.subtitle || '';
      form.querySelector('[name="nl_is_active"]').checked = cmsData.newsletter.is_active !== false;
    }
  }

  // Edit functions (open modals)
  window.editSlider = function(id) {
    const slider = cmsData.sliders.find(s => s.id === id);
    if (!slider) return;
    
    openModal('sliderModal', {
      edit_id: slider.id,
      title: slider.title || '',
      subtitle: slider.subtitle || '',
      image_url: slider.image_url || '',
      cta_text: slider.cta_text || '',
      cta_link: slider.cta_link || '',
      background_color: slider.background_color || '#ffffff',
      text_color: slider.text_color || '#000000',
      display_order: slider.display_order || 0,
      is_active: slider.is_active !== false
    });
  };

  window.editCategory = function(id) {
    const cat = cmsData.categories.find(c => c.id === id);
    if (!cat) return;
    
    openModal('categoryModal', {
      edit_id: cat.id,
      name: cat.name || '',
      slug: cat.slug || '',
      icon_emoji: cat.icon_emoji || '📂',
      image_url: cat.image_url || '',
      description: cat.description || '',
      display_order: cat.display_order || 0,
      is_active: cat.is_active !== false
    });
  };

  window.editBanner = function(id) {
    const banner = cmsData.banners.find(b => b.id === id);
    if (!banner) return;
    
    openModal('bannerModal', {
      edit_id: banner.id,
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      offer_text: banner.offer_text || '',
      image_url: banner.image_url || '',
      gradient_start: banner.gradient_start || '#667eea',
      gradient_end: banner.gradient_end || '#764ba2',
      cta_text: banner.cta_text || '',
      cta_link: banner.cta_link || '',
      display_order: banner.display_order || 0,
      is_active: banner.is_active !== false
    });
  };

  window.editSection = function(id) {
    const section = cmsData.sections.find(s => s.id === id);
    if (!section) return;
    
    openModal('sectionModal', {
      edit_id: section.id,
      title: section.title || '',
      subtitle: section.subtitle || '',
      section_type: section.section_type || 'featured',
      display_order: section.display_order || 0,
      is_active: section.is_active !== false
    });
  };

  window.editTrustFeature = function(id) {
    const feature = cmsData.trustFeatures.find(f => f.id === id);
    if (!feature) return;
    
    openModal('trustModal', {
      edit_id: feature.id,
      icon_emoji: feature.icon_emoji || '✓',
      title: feature.title || '',
      description: feature.description || '',
      display_order: feature.display_order || 0,
      is_active: feature.is_active !== false
    });
  };

  // Open modal functions for Add buttons
  window.openSectionModal = function() {
    openModal('section-modal', {
      section_type: 'featured',
      is_active: true
    });
  };

  window.openTrustModal = function() {
    openModal('trust-modal', {
      icon_emoji: '✓',
      is_active: true
    });
  };

  // Close modal functions
  window.closeSliderModal = function() { closeModal('slider-modal'); };
  window.closeCategoryModal = function() { closeModal('category-modal'); };
  window.closeBannerModal = function() { closeModal('banner-modal'); };
  window.closeSectionModal = function() { closeModal('section-modal'); };
  window.closeTrustModal = function() { closeModal('trust-modal'); };

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

  // Add button handlers
  document.getElementById('addSliderBtn')?.addEventListener('click', () => {
    openModal('sliderModal', {
      background_color: '#ffffff',
      text_color: '#000000',
      is_active: true
    });
  });

  document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    openModal('categoryModal', {
      icon_emoji: '📂',
      is_active: true
    });
  });

  document.getElementById('addBannerBtn')?.addEventListener('click', () => {
    openModal('bannerModal', {
      gradient_start: '#667eea',
      gradient_end: '#764ba2',
      is_active: true
    });
  });

  // Newsletter form
  document.getElementById('saveNewsletterBtn')?.addEventListener('click', async () => {
    const form = document.getElementById('newsletterForm');
    const data = {
      title: form.nl_title.value,
      subtitle: form.nl_subtitle.value,
      is_active: form.nl_is_active.checked
    };
    
    try {
      const response = await fetch(`${API_BASE}/newsletter`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      if (result.success) {
        showToast('Newsletter settings saved!', 'success');
        loadCMSData();
      } else {
        showToast(result.error || 'Save failed', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    }
  });

  // Utility: Escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Toast notifications
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

})();