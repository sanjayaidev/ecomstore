// CMS Manager - Homepage Content Management System

const CMS = (function() {
  const API_BASE = '/api/cms';
  
  // State
  let currentTab = 'sliders';
  let cmsData = {
    sliders: [],
    categories: [],
    banners: [],
    sections: [],
    trustFeatures: [],
    newsletter: null
  };

  // Initialize
  function init() {
    initTabs();
    setupAddButtons();
    setupForms();
  }

  // Expose loadCMSData globally
  window.loadCMSData = loadCMSData;
  
  // Expose edit/delete functions globally
  window.editSlider = editSlider;
  window.editCategory = editCategory;
  window.editBanner = editBanner;
  window.editSection = editSection;
  window.editTrustFeature = editTrustFeature;
  window.deleteSlider = deleteSlider;
  window.deleteCategory = deleteCategory;
  window.deleteBanner = deleteBanner;
  window.closeSliderModal = closeSliderModal;
  window.closeCategoryModal = closeCategoryModal;
  window.closeBannerModal = closeBannerModal;
  window.closeSectionModal = closeSectionModal;
  window.closeTrustModal = closeTrustModal;

  // Tab Navigation
  function initTabs() {
    const tabs = document.querySelectorAll('#cmsTabs .settings-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.cmstab;
        
        document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`cmstab-${currentTab}`).classList.add('active');
        
        renderCurrentTab();
      });
    });
  }

  // Load all CMS data
  async function loadCMSData() {
    try {
      const response = await fetch(`${API_BASE}/content`);
      const result = await response.json();
      
      if (result.success) {
        cmsData = result.data;
        renderCurrentTab();
        // Hide all loading spinners
        document.querySelectorAll('.loading-spinner').forEach(el => el.style.display = 'none');
        // Show form container for newsletter
        const nlContainer = document.getElementById('newsletter-form-container');
        if (nlContainer) nlContainer.style.display = 'block';
      } else {
        showToast('Failed to load CMS data', 'error');
      }
    } catch (error) {
      console.error('Error loading CMS data:', error);
      showToast('Error connecting to server', 'error');
    }
  }

  // Render current tab content
  function renderCurrentTab() {
    switch(currentTab) {
      case 'sliders': renderSliders(); break;
      case 'categories': renderCategories(); break;
      case 'banners': renderBanners(); break;
      case 'sections': renderSections(); break;
      case 'trust': renderTrustFeatures(); break;
      case 'newsletter': renderNewsletter(); break;
    }
  }

  // Render Hero Sliders
  function renderSliders() {
    const container = document.getElementById('slidersList');
    if (!container) return;
    
    if (cmsData.sliders.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem">No sliders yet. Click "Add Slider" to create one.</p>';
      return;
    }
    
    container.innerHTML = cmsData.sliders.map(slider => `
      <div class="data-row" data-id="${slider.id}">
        <div class="data-row__preview" style="background:${slider.background_color || '#f3f4f6'}">
          ${slider.image_url ? `<img src="${slider.image_url}" alt="${slider.title}" onerror="this.style.display='none'">` : ''}
          <span>${slider.icon_emoji || '🎠'}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${escapeHtml(slider.title)}</div>
          <div class="data-row__meta">
            <span>${slider.subtitle || 'No subtitle'}</span>
            ${slider.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge">Inactive</span>'}
            <span>Order: ${slider.display_order}</span>
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="editSlider(${slider.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteSlider(${slider.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // Render Categories
  function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    
    if (cmsData.categories.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem">No categories yet.</p>';
      return;
    }
    
    container.innerHTML = cmsData.categories.map(cat => `
      <div class="data-row" data-id="${cat.id}">
        <div class="data-row__preview">
          <span style="font-size:2rem">${cat.icon_emoji || '📂'}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${escapeHtml(cat.name)}</div>
          <div class="data-row__meta">
            <span>/${cat.slug}</span>
            ${cat.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge">Inactive</span>'}
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="editCategory(${cat.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteCategory(${cat.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // Render Offer Banners
  function renderBanners() {
    const container = document.getElementById('bannersList');
    if (!container) return;
    
    if (cmsData.banners.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem">No offer banners yet.</p>';
      return;
    }
    
    container.innerHTML = cmsData.banners.map(banner => `
      <div class="data-row" data-id="${banner.id}">
        <div class="data-row__preview" style="background:linear-gradient(135deg,${banner.gradient_start || '#667eea'},${banner.gradient_end || '#764ba2'})">
          <span style="color:white;font-weight:bold">${banner.offer_text || 'OFFER'}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${escapeHtml(banner.title)}</div>
          <div class="data-row__meta">
            <span>${banner.subtitle || ''}</span>
            ${banner.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge">Inactive</span>'}
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="editBanner(${banner.id})" title="Edit">✏️</button>
          <button class="btn-icon danger" onclick="deleteBanner(${banner.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `).join('');
  }

  // Render Product Sections
  function renderSections() {
    const container = document.getElementById('sectionsList');
    if (!container) return;
    
    if (cmsData.sections.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem">No product sections yet.</p>';
      return;
    }
    
    container.innerHTML = cmsData.sections.map(section => `
      <div class="data-row" data-id="${section.id}">
        <div class="data-row__preview">
          <span style="font-size:2rem">📦</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${escapeHtml(section.title)}</div>
          <div class="data-row__meta">
            <span>${section.section_type || 'custom'}</span>
            ${section.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge">Inactive</span>'}
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="editSection(${section.id})" title="Edit">✏️</button>
        </div>
      </div>
    `).join('');
  }

  // Render Trust Features
  function renderTrustFeatures() {
    const container = document.getElementById('trustList');
    if (!container) return;
    
    if (cmsData.trustFeatures.length === 0) {
      container.innerHTML = '<p class="text-muted text-center" style="padding:2rem">No trust features yet.</p>';
      return;
    }
    
    container.innerHTML = cmsData.trustFeatures.map(feature => `
      <div class="data-row" data-id="${feature.id}">
        <div class="data-row__preview">
          <span style="font-size:2rem">${feature.icon_emoji || '✓'}</span>
        </div>
        <div class="data-row__info">
          <div class="data-row__title">${escapeHtml(feature.title)}</div>
          <div class="data-row__meta">
            <span>${feature.description || ''}</span>
            ${feature.is_active ? '<span class="status-badge active">Active</span>' : '<span class="status-badge">Inactive</span>'}
          </div>
        </div>
        <div class="data-row__actions">
          <button class="btn-icon" onclick="editTrustFeature(${feature.id})" title="Edit">✏️</button>
        </div>
      </div>
    `).join('');
  }

  // Render Newsletter Settings
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
    
    openModal('slider-modal', {
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
    
    openModal('category-modal', {
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
    
    openModal('banner-modal', {
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
    
    openModal('section-modal', {
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
    
    openModal('trust-modal', {
      edit_id: feature.id,
      icon_emoji: feature.icon_emoji || '✓',
      title: feature.title || '',
      description: feature.description || '',
      display_order: feature.display_order || 0,
      is_active: feature.is_active !== false
    });
  };

  // Close modal functions
  window.closeSliderModal = function() { closeModal('slider-modal'); };
  window.closeCategoryModal = function() { closeModal('category-modal'); };
  window.closeBannerModal = function() { closeModal('banner-modal'); };
  window.closeSectionModal = function() { closeModal('section-modal'); };
  window.closeTrustModal = function() { closeModal('trust-modal'); };

  // Modal handling
  function openModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    // Populate form fields
    Object.keys(data).forEach(key => {
      const field = modal.querySelector(`[name="${key}"]`);
      if (field) {
        if (field.type === 'checkbox') {
          field.checked = data[key];
        } else {
          field.value = data[key];
        }
      }
    });
    
    modal.style.display = 'flex';
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  }

  // Form submissions
  document.querySelectorAll('.modal-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      
      // Convert checkbox values
      Object.keys(data).forEach(key => {
        if (data[key] === 'on') data[key] = true;
        if (data[key] === 'off') data[key] = false;
      });
      
      // Convert numbers
      if (data.display_order) data.display_order = parseInt(data.display_order);
      
      const action = form.dataset.action;
      const endpoint = form.dataset.endpoint;
      
      try {
        const method = data.edit_id ? 'PUT' : 'POST';
        const url = data.edit_id ? `${endpoint}/${data.edit_id}` : endpoint;
        delete data.edit_id;
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
          showToast('Saved successfully!', 'success');
          closeModal(form.closest('.modal').id);
          loadCMSData();
        } else {
          showToast(result.error || 'Save failed', 'error');
        }
      } catch (error) {
        console.error('Save error:', error);
        showToast('Network error', 'error');
      }
    });
  });

  // Delete functions
  window.deleteSlider = async function(id) {
    if (!confirm('Delete this slider?')) return;
    await deleteItem(`${API_BASE}/sliders/${id}`, 'Slider deleted');
  };

  window.deleteCategory = async function(id) {
    if (!confirm('Delete this category?')) return;
    await deleteItem(`${API_BASE}/categories/${id}`, 'Category deleted');
  };

  window.deleteBanner = async function(id) {
    if (!confirm('Delete this banner?')) return;
    await deleteItem(`${API_BASE}/banners/${id}`, 'Banner deleted');
  };

  async function deleteItem(url, successMsg) {
    try {
      const response = await fetch(url, { method: 'DELETE' });
      const result = await response.json();
      
      if (result.success) {
        showToast(successMsg, 'success');
        loadCMSData();
      } else {
        showToast(result.error || 'Delete failed', 'error');
      }
    } catch (error) {
      showToast('Network error', 'error');
    }
  }

  // Add button handlers
  function setupAddButtons() {
    document.getElementById('addSliderBtn')?.addEventListener('click', () => {
      openModal('slider-modal', {
        background_color: '#ffffff',
        text_color: '#000000',
        is_active: true
      });
    });

    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
      openModal('category-modal', {
        icon_emoji: '📂',
        is_active: true
      });
    });

    document.getElementById('addBannerBtn')?.addEventListener('click', () => {
      openModal('banner-modal', {
        gradient_start: '#667eea',
        gradient_end: '#764ba2',
        is_active: true
      });
    });
  }

  // Setup form submissions
  function setupForms() {
    // Newsletter form
    document.getElementById('saveNewsletterBtn')?.addEventListener('click', async (e) => {
      if (e) e.preventDefault();
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
  }

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

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);

})();